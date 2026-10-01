import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUp, Check, CheckCheck, MessagesSquare, Search } from 'lucide-react';
import {
  chatService,
  type ConversationSummary,
  type ConversationThread,
  type InboxSide,
} from '@/features/chat/api';
import { firstImage } from '@/features/listings/model';
import { useUIStore } from '@/shared/store/uiStore';
import { queryKeys } from '@/shared/lib/queryKeys';
import { toApiError } from '@/shared/lib/api';

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

// Assembled by hand: en-GB puts the day first but abbreviates September as
// "Sept", and en-US has "Sep" but the wrong order.
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short' });

/** "22 Sep" in the list; the year only when it is not this one. */
function listDate(iso: string): string {
  const d = new Date(iso);
  const day = `${d.getDate()} ${MONTH.format(d)}`;
  return d.getFullYear() === new Date().getFullYear() ? day : `${day} ${d.getFullYear()}`;
}

/** Under a bubble: the time today, the date and time before that. */
function stamp(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? time : `${listDate(iso)}, ${time}`;
}

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase();

function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' }) {
  return (
    <span className={`ws-vxavatar ws-vxavatar--${size}`} aria-hidden>
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

/**
 * Both inboxes, the seller's and the buyer's, laid out as the sandbox's vendor
 * Messages: a searchable list beside the open thread, the listing it is about
 * pinned in the thread's header. Below 860px the two take turns, with Back
 * returning to the list.
 */
export default function Inbox({ side }: { side: InboxSide }) {
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  // ?conversation= opens a thread directly, as the Overview's list links do.
  const [activeId, setActiveId] = useState<string | null>(() => params.get('conversation'));
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const endRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const client = useQueryClient();

  const isVendor = side === 'selling';

  const loadList = useCallback(async () => {
    try {
      const res = await chatService.list({ side, limit: 50 });
      setConversations(res.data);
      setActiveId((current) => current ?? res.data[0]?.id ?? null);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not load messages') });
    } finally {
      setLoadingList(false);
    }
  }, [side, addToast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!activeId) return;
    const id = activeId;
    let cancelled = false;

    setLoadingThread(true);
    chatService
      .get(id, { limit: 100 })
      .then(async (res) => {
        if (cancelled) return;
        setThread(res.data);

        if ((isVendor ? res.data.vendorUnread : res.data.buyerUnread) > 0) {
          await chatService.markRead(id);
          if (cancelled) return;
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unread: 0, vendorUnread: 0, buyerUnread: 0 } : c)),
          );
          client.invalidateQueries({ queryKey: queryKeys.unreadCount() });
          client.invalidateQueries({ queryKey: queryKeys.vendorDashboard() });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) addToast({ type: 'error', message: errMessage(err, 'Could not open this conversation') });
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeId, isVendor, addToast, client]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [thread?.messages.length]);

  // The composer grows with what is typed, one line to about five.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 112)}px`;
  }, [draft]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;

    setSending(true);
    try {
      const res = await chatService.send(activeId, body);
      setThread((t) => (t ? { ...t, messages: [...t.messages, res.data] } : t));
      setDraft('');
      await loadList();
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Message not sent') });
    } finally {
      setSending(false);
    }
  };

  const counterpart = (c: ConversationSummary) =>
    isVendor ? (c.buyer?.name ?? 'A buyer') : c.store.name;

  const shown = conversations.filter((c) =>
    `${counterpart(c)} ${c.listing?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const open = Boolean(activeId && thread);
  const name = thread ? counterpart(thread) : '';
  const listingTo = thread?.listing
    ? isVendor
      ? `/vendor/products/${thread.listing.id}`
      : `/listings/${thread.listing.slug}`
    : null;
  const thumb = thread?.listing ? firstImage(thread.listing) : null;

  return (
    <div className={`ws-vxinbox${open ? ' is-open' : ''}`}>
      <aside className="ws-vxinbox__list">
        <div className="ws-vxinbox__search">
          <div className="ws-vxinbox__field">
            <Search size={16} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search conversations"
              placeholder="Search conversations"
            />
          </div>
        </div>

        {loadingList ? (
          <div className="ws-vxinbox__loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ws-skeleton" style={{ height: 52 }} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="ws-vxinbox__none">
            {isVendor
              ? 'No one has messaged you yet. Buyers contact you from your listings, so publishing more of them is the fastest way to get inquiries.'
              : 'You have not messaged any sellers yet.'}
          </p>
        ) : (
          <ul className="ws-vxinbox__items">
            {shown.map((c) => {
              const who = counterpart(c);
              const mine = c.lastMessage?.senderRole === (isVendor ? 'VENDOR' : 'BUYER');
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={c.id === activeId}
                    onClick={() => setActiveId(c.id)}
                    className={`ws-vxinbox__item${c.id === activeId ? ' is-on' : ''}`}
                  >
                    <span className="ws-vxinbox__who">
                      <Avatar name={who} src={isVendor ? null : c.store.logo} />
                      {c.unread > 0 && <span className="ws-vxinbox__unread ws-num">{c.unread}</span>}
                    </span>
                    <span className="ws-vxinbox__text">
                      <span className="ws-vxinbox__row">
                        <strong>{who}</strong>
                        <time dateTime={c.lastMessageAt}>{listDate(c.lastMessageAt)}</time>
                      </span>
                      <span className="ws-vxinbox__about">{c.listing?.name ?? 'Listing removed'}</span>
                      <span className="ws-vxinbox__last">
                        {c.lastMessage ? `${mine ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages yet'}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="ws-vxinbox__none">Nothing matches “{query}”.</li>}
          </ul>
        )}
      </aside>

      {open && thread ? (
        <section className="ws-vxinbox__thread" aria-label={`Conversation with ${name}`}>
          <header className="ws-vxinbox__head">
            <button
              type="button"
              className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost ws-vxinbox__back"
              onClick={() => {
                setActiveId(null);
                setThread(null);
              }}
            >
              <ArrowLeft size={14} aria-hidden />
              Back
            </button>
            <Avatar name={name} src={isVendor ? null : thread.store.logo} />
            <div className="ws-vxinbox__headtext">
              <h2>{name}</h2>
              <p>
                {thread.listing
                  ? isVendor
                    ? `About ${thread.listing.name}`
                    : 'Replies show up here and in your notifications'
                  : 'This listing has been deleted'}
                {!isVendor && (
                  <>
                    {' · '}
                    <Link to={`/stores/${thread.store.slug}`}>Visit store</Link>
                  </>
                )}
              </p>
            </div>
            {listingTo && thread.listing && (
              <Link to={listingTo} className="ws-vxinbox__listing">
                {thumb ? <img src={thumb} alt="" /> : <span />}
                <span>{thread.listing.name}</span>
              </Link>
            )}
          </header>

          <ol className="ws-vxinbox__messages" aria-label={`Messages with ${name}`}>
            {thread.messages.map((m, i) => {
              const mine = m.senderRole === thread.myRole;
              const runStart = !mine && thread.messages[i - 1]?.senderRole !== m.senderRole;
              return (
                <li key={m.id} className={`ws-vxmsg${mine ? ' is-mine' : ''}`}>
                  {!mine && (
                    <span className="ws-vxmsg__side">{runStart && <Avatar name={name} size="sm" />}</span>
                  )}
                  <div className="ws-vxmsg__col">
                    <p className="ws-vxmsg__bubble">{m.body}</p>
                    <div className="ws-vxmsg__meta">
                      <time dateTime={m.createdAt}>{stamp(m.createdAt)}</time>
                      {mine &&
                        (m.readAt ? (
                          <CheckCheck size={14} aria-label="Read" className="ws-vxmsg__read" />
                        ) : (
                          <Check size={14} aria-label="Sent" />
                        ))}
                    </div>
                  </div>
                </li>
              );
            })}
            <li ref={endRef} aria-hidden />
          </ol>

          <div className="ws-vxinbox__compose">
            {thread.status === 'BLOCKED' ? (
              <p className="ws-vxinbox__closed">This conversation has been closed by WorldStore.</p>
            ) : (
              <form
                className="ws-vxinbox__field ws-vxinbox__field--compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={`Message ${name}`}
                  aria-label="Compose message"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="ws-vxinbox__send"
                  aria-label="Send message"
                  disabled={sending || !draft.trim()}
                >
                  <ArrowUp size={16} aria-hidden />
                </button>
              </form>
            )}
          </div>
        </section>
      ) : (
        <section className="ws-vxinbox__thread ws-vxinbox__thread--idle">
          <div className="ws-vxempty">
            <span className="ws-cxempty__icon"><MessagesSquare size={20} aria-hidden /></span>
            <p className="ws-cxempty__title">{loadingThread ? 'Opening conversation…' : 'Choose a conversation'}</p>
            <p className="ws-cxempty__body">
              {isVendor ? 'Select a buyer message to open the thread.' : 'Select a seller to open the thread.'}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
