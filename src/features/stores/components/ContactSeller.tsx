import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
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

type ContactSellerProps = {
  listing: PublicListing;
  subject?: string;
};

export default function ContactSeller({ listing, subject }: ContactSellerProps) {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
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

  const draft = `Hi, is "${subject ?? listing.name}" still available?`;

  const start = () => {
    if (!isSignedIn) {
      navigate(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setMessage(draft);
    setOpen(true);
    // The textarea only exists once open, so focus waits for the paint.
    requestAnimationFrame(() => document.getElementById('contact-message')?.focus());
  };

  const send = () => {
    const body = message.trim();
    if (body.length < 2) return;
    sendMutation.mutate(body);
  };

  if (sentId) {
    return (
      <div className="ws-sent">
        <span className="ws-sent__icon"><CheckCircle2 size={20} aria-hidden /></span>
        <div>
          <h2 className="ws-title">Message sent</h2>
          <p className="ws-caption ws-muted">
            {store.name} has been notified. Replies appear in your messages.
          </p>
        </div>
        <button
          className="ws-btn ws-btn--secondary ws-btn--block"
          onClick={() => navigate('/account/messages')}
        >
          Go to messages
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="ws-ask">
        <button type="button" className="ws-btn ws-btn--primary ws-btn--block ws-ask__cta" onClick={start}>
          <MessageCircle size={18} aria-hidden />
          {isSignedIn ? 'Message seller' : 'Sign in to message'}
        </button>
        <p className="ws-ask__note">
          {isSignedIn
            ? `Ask ${store.name} if it is still available, or make an offer.`
            : 'A free account lets the seller reply to you. Signing in brings you back here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="ws-ask">
      <label className="ws-label" htmlFor="contact-message">Your message</label>
      <textarea
        id="contact-message"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        className="ws-textarea"
      />
      <div className="ws-ask__row">
        <button
          className="ws-btn ws-btn--primary ws-ask__send"
          onClick={send}
          disabled={sendMutation.isPending}
        >
          <MessageCircle size={18} aria-hidden />
          {sendMutation.isPending ? 'Sending…' : 'Send message'}
        </button>
        <button type="button" className="ws-btn ws-btn--ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
