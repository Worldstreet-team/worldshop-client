import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  chatService,
  type ConversationSummary,
  type ConversationThread,
  type InboxSide,
} from '@/features/chat/api';
import { useUIStore } from '@/shared/store/uiStore';
import { queryKeys } from '@/shared/lib/queryKeys';
import { toApiError } from '@/shared/lib/api';

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export default function Inbox({ side }: { side: InboxSide }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const endRef = useRef<HTMLDivElement>(null);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;

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

      const counterpartName = (c: ConversationSummary) =>
    isVendor ? (c.buyer?.name ?? c.listing?.name ?? 'a listing') : c.store.name;

  return (
    <div className="ws-inbox">

      <aside className="ws-inbox__list">
        <div className="ws-inbox__head">
          {isVendor ? 'Customer messages' : 'My conversations'}
        </div>

        {loadingList ? (
          <div className="ws-stack" style={{ padding: 'var(--ws-space-4)' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="ws-skeleton" style={{ height: 44 }} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="ws-caption ws-muted" style={{ padding: 'var(--ws-space-6) var(--ws-space-4)' }}>
            {isVendor
              ? 'No one has messaged you yet. Buyers contact you from your listings, so publishing more of them is the fastest way to get inquiries.'
              : 'You have not messaged any sellers yet.'}
          </p>
        ) : (
          <ul className="ws-inbox__scroll">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setActiveId(c.id)}
                  className={`ws-inbox__item${c.id === activeId ? ' is-active' : ''}`}
                >
                  <div className="ws-inbox__row">
                    <span className={`ws-inbox__name${c.unread > 0 ? ' ws-inbox__name--unread' : ''}`}>
                      {counterpartName(c)}
                    </span>
                    {c.unread > 0 && <span className="ws-inbox__count">{c.unread}</span>}
                  </div>

                  {isVendor && c.buyer && (
                    <div className="ws-inbox__sub">{c.listing?.name ?? 'Listing removed'}</div>
                  )}
                  <div className="ws-inbox__preview">
                    {c.lastMessage
                      ? `${c.lastMessage.senderRole === (isVendor ? 'VENDOR' : 'BUYER') ? 'You: ' : ''}${c.lastMessage.body}`
                      : 'No messages yet'}
                  </div>
                  <div className="ws-inbox__sub">{timeAgo(c.lastMessageAt)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="ws-inbox__thread">
        {!activeId || !thread ? (
          <p className="ws-body ws-muted" style={{ margin: 'auto', padding: 'var(--ws-space-8)', textAlign: 'center' }}>
            {loadingThread ? 'Loading conversation…' : 'Select a conversation to read it.'}
          </p>
        ) : (
          <>
            <header className="ws-inbox__threadhead">
              <div className="ws-title">
                {isVendor
                  ? thread.buyer?.name ?? thread.listing?.name ?? 'Listing removed'
                  : thread.store.name}
              </div>
              <div className="ws-caption ws-muted">
                {isVendor ? (
                  thread.listing ? (
                    <>
                      {thread.buyer ? `About: ${thread.listing.name} · ` : null}
                      <Link to={`/vendor/products/${thread.listing.id}`}>View listing</Link>
                    </>
                  ) : (
                    'This listing has been deleted'
                  )
                ) : (
                  <Link to={`/stores/${thread.store.slug}`}>Visit store</Link>
                )}
              </div>
            </header>

            <div className="ws-inbox__messages">
              {thread.messages.map((m) => {
                const mine = m.senderRole === thread.myRole;
                return (
                  <div key={m.id} className={`ws-bubble${mine ? ' ws-bubble--mine' : ''}`}>
                    <div className="ws-bubble__body">{m.body}</div>
                    <div className="ws-bubble__time">
                      {clockTime(m.createdAt)}
                      {mine && m.readAt ? ' · Read' : ''}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {thread.status === 'BLOCKED' ? (
              <div className="ws-alert" style={{ margin: 'var(--ws-space-3)' }}>
                <span>This conversation has been closed by WorldStore.</span>
              </div>
            ) : (
              <form onSubmit={handleSend} className="ws-inbox__compose">
                <input
                  className="ws-field"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isVendor ? 'Reply to this buyer…' : 'Ask the seller a question…'}
                  maxLength={2000}
                />
                <button
                  type="submit"
                  className="ws-btn ws-btn--primary"
                  disabled={sending || !draft.trim()}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
