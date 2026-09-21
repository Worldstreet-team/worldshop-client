import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle2, ShieldAlert, MessageCircle } from 'lucide-react';
import { chatService } from '@/features/chat/api';
import type { PublicListing } from '@/features/stores/api';
import { useUIStore } from '@/shared/store/uiStore';
import { queryKeys } from '@/shared/lib/queryKeys';
import { toApiError } from '@/shared/lib/api';

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

export default function ContactSeller({ listing }: { listing: PublicListing }) {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const [message, setMessage] = useState(
    `Hi, is "${listing.name}" still available?`,
  );
  const [sentId, setSentId] = useState<string | null>(null);
  const store = listing.store;

  const sendMutation = useMutation({
    mutationFn: (body: string) => chatService.start({ listingId: listing.id, message: body }),
    onSuccess: (res) => {
      setSentId(res.data.id);
      addToast({ type: 'success', message: 'Message sent. The seller will be notified.' });
      client.invalidateQueries({ queryKey: queryKeys.listingReviewEligibility(listing.id) });
      client.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
    onError: (err) => addToast({ type: 'error', message: errMessage(err, 'Could not send your message') }),
  });

  const handleSend = () => {
    if (!isSignedIn) {
      navigate(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const body = message.trim();
    if (body.length < 2) return;
    sendMutation.mutate(body);
  };

  if (sentId) {
    return (
      <div className="ws-card ws-sent">
        <span className="ws-sent__icon"><CheckCircle2 size={20} aria-hidden /></span>
        <h2 className="ws-title">Message sent</h2>
        <p className="ws-caption ws-muted">
          {store.name} has been notified. Replies appear in your messages.
        </p>
        <button
          className="ws-btn ws-btn--primary ws-btn--block"
          onClick={() => navigate('/account/messages')}
        >
          Go to messages
        </button>
      </div>
    );
  }

  return (
    <div className="ws-card ws-contact">
      <h2 className="ws-h2">Contact seller</h2>
      <p className="ws-contact__intro">
        Send {store.name} a message to ask questions or agree a price.
      </p>

      <label className="ws-label" htmlFor="contact-message">Your message</label>
      <textarea
        id="contact-message"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        className="ws-textarea"
        aria-describedby="contact-help"
      />
      <p className="ws-contact__help" id="contact-help">
        {isSignedIn
          ? 'Edit the message or send it as it is. Replies arrive in your Messages.'
          : 'You need a free account so the seller can reply to you. Signing in brings you back here.'}
      </p>

      <button
        className="ws-btn ws-btn--primary ws-btn--block"
        onClick={handleSend}
        disabled={sendMutation.isPending}
      >
        <MessageCircle size={18} aria-hidden />
        {sendMutation.isPending ? 'Sending…' : isSignedIn ? 'Send message' : 'Sign in to message'}
      </button>

      <p className="ws-safety">
        <ShieldAlert size={16} aria-hidden />
        <span>
          Never pay before you have seen the item. WorldStore does not handle
          payment or delivery, so there is no refund if a deal goes wrong.
        </span>
      </p>
    </div>
  );
}
