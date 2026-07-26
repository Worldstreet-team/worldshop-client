import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  chatService,
  type ConversationSummary,
  type ConversationThread,
  type InboxSide,
} from '@/services/chatService';
import { useUIStore } from '@/store/uiStore';

/**
 * Message inbox, shared by both sides.
 *
 * The same component serves buyers and vendors because the thread is
 * symmetrical — only the labelling differs. What is NOT shared is the list: a
 * user can be both, and mixing "things I asked about" with "customers asking
 * about my stock" makes both unreadable. The side is explicit, never inferred.
 *
 * For a vendor this is the most consequential screen on the platform. Replying
 * is what produces their response rate, which buyers see, and an unanswered
 * thread counts against them.
 */

type ApiError = { response?: { data?: { message?: string } } };
const errMessage = (err: unknown, fallback: string) =>
  (err as ApiError).response?.data?.message || fallback;

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

  const isVendor = side === 'selling';

  const loadList = useCallback(async () => {
    try {
      const res = await chatService.list({ side, limit: 50 });
      setConversations(res.data);
      // Open the newest thread on a wide screen so the pane is never blank.
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

  // Opening a thread marks it read, which is also what clears the badge the
  // dashboard shows.
  const openThread = useCallback(
    async (id: string) => {
      setLoadingThread(true);
      try {
        const res = await chatService.get(id, { limit: 100 });
        setThread(res.data);

        if ((isVendor ? res.data.vendorUnread : res.data.buyerUnread) > 0) {
          await chatService.markRead(id);
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unread: 0, vendorUnread: 0, buyerUnread: 0 } : c)),
          );
        }
      } catch (err: unknown) {
        addToast({ type: 'error', message: errMessage(err, 'Could not open this conversation') });
      } finally {
        setLoadingThread(false);
      }
    },
    [isVendor, addToast],
  );

  useEffect(() => {
    if (activeId) openThread(activeId);
  }, [activeId, openThread]);

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
      // Appended locally rather than refetching — the reply should appear the
      // instant it is accepted.
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
    isVendor ? (c.listing?.name ?? 'a listing') : c.store.name;

  return (
    <div className="inbox" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: '1rem', minHeight: 480 }}>
      {/* ── Conversation list ── */}
      <aside style={{ border: '1px solid #e4e7ec', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e4e7ec', fontWeight: 600 }}>
          {isVendor ? 'Customer messages' : 'My conversations'}
        </div>

        {loadingList ? (
          <p style={{ padding: '1rem', color: '#667085' }}>Loading…</p>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '1.5rem 1rem', color: '#667085', fontSize: '0.9rem' }}>
            {isVendor
              ? 'No one has messaged you yet. Buyers contact you from your listings, so publishing more of them is the fastest way to get inquiries.'
              : 'You have not messaged any sellers yet.'}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 560, overflowY: 'auto' }}>
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    style={{
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: '0.75rem 1rem', border: 'none',
                      borderBottom: '1px solid #f2f4f7',
                      background: active ? '#f8f9fc' : 'white',
                      borderLeft: `3px solid ${active ? '#101828' : 'transparent'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span style={{ fontWeight: c.unread > 0 ? 700 : 600, fontSize: '0.92rem' }}>
                        {counterpartName(c)}
                      </span>
                      {c.unread > 0 && (
                        <span style={{ background: '#b42318', color: 'white', borderRadius: 999, padding: '0 0.45rem', fontSize: '0.72rem', fontWeight: 700 }}>
                          {c.unread}
                        </span>
                      )}
                    </div>

                    <div style={{ color: '#667085', fontSize: '0.82rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.lastMessage
                        ? `${c.lastMessage.senderRole === (isVendor ? 'VENDOR' : 'BUYER') ? 'You: ' : ''}${c.lastMessage.body}`
                        : 'No messages yet'}
                    </div>
                    <div style={{ color: '#98a2b3', fontSize: '0.75rem', marginTop: 2 }}>
                      {timeAgo(c.lastMessageAt)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ── Thread ── */}
      <section style={{ border: '1px solid #e4e7ec', borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
        {!activeId || !thread ? (
          <div style={{ margin: 'auto', color: '#667085', padding: '2rem', textAlign: 'center' }}>
            {loadingThread ? 'Loading conversation…' : 'Select a conversation to read it.'}
          </div>
        ) : (
          <>
            <header style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e4e7ec' }}>
              <div style={{ fontWeight: 600 }}>
                {isVendor ? thread.listing?.name ?? 'Listing removed' : thread.store.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#667085' }}>
                {isVendor ? (
                  // The listing may be gone; the conversation outlives it.
                  thread.listing
                    ? <Link to={`/vendor/products/${thread.listing.id}`}>View listing</Link>
                    : 'This listing has been deleted'
                ) : (
                  <Link to={`/stores/${thread.store.slug}`}>Visit store</Link>
                )}
              </div>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 420 }}>
              {thread.messages.map((m) => {
                const mine = m.senderRole === thread.myRole;
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                      background: mine ? '#101828' : '#f2f4f7',
                      color: mine ? 'white' : '#101828',
                      padding: '0.55rem 0.8rem',
                      borderRadius: 12,
                      borderBottomRightRadius: mine ? 2 : 12,
                      borderBottomLeftRadius: mine ? 12 : 2,
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                      {clockTime(m.createdAt)}
                      {mine && m.readAt ? ' · Read' : ''}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {thread.status === 'BLOCKED' ? (
              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e4e7ec', color: '#b42318' }}>
                This conversation has been closed by WorldStreet.
              </div>
            ) : (
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid #e4e7ec' }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={isVendor ? 'Reply to this buyer…' : 'Ask the seller a question…'}
                  maxLength={2000}
                  style={{ flex: 1, padding: '0.55rem 0.75rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
                />
                <button type="submit" className="btn-primary" disabled={sending || !draft.trim()}>
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
