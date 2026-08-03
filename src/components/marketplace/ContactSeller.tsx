import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { CheckCircle2, Phone, ShieldAlert, MessageCircle } from 'lucide-react';
import { chatService } from '@/services/chatService';
import type { PublicListing } from '@/services/storeService';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * The primary action on the marketplace.
 *
 * Nothing is bought here — the whole product is putting a buyer in touch with
 * a seller. The in-platform message is the default because it is what feeds
 * the seller's response rate, verifies reviews, and gives the buyer a record.
 * Phone and WhatsApp are offered underneath rather than instead: hiding them
 * would just push people to ask for a number in the first message.
 */

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

/** Nigerian numbers are entered locally; wa.me needs them international. */
function waLink(number: string, listingName: string): string {
  const digits = number.replace(/\D/g, '');
  const intl = digits.startsWith('234') ? digits : `234${digits.replace(/^0/, '')}`;
  const text = encodeURIComponent(`Hi, I saw "${listingName}" on WorldStreet and I'm interested.`);
  return `https://wa.me/${intl}?text=${text}`;
}

export default function ContactSeller({ listing }: { listing: PublicListing }) {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [message, setMessage] = useState(
    `Hi, is "${listing.name}" still available?`,
  );
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);

  const store = listing.store;

  const handleSend = async () => {
    if (!isSignedIn) {
      navigate(`/auth/login?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const body = message.trim();
    if (body.length < 2) return;

    setSending(true);
    try {
      const res = await chatService.start({ listingId: listing.id, message: body });
      setSentId(res.data.id);
      addToast({ type: 'success', message: 'Message sent. The seller will be notified.' });
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not send your message') });
    } finally {
      setSending(false);
    }
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
      <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-3)' }}>Contact seller</h2>

      <label className="ws-label" htmlFor="contact-message">Your message</label>
      <textarea
        id="contact-message"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        className="ws-textarea"
      />

      <button
        className="ws-btn ws-btn--primary ws-btn--block"
        onClick={handleSend}
        disabled={sending}
      >
        <MessageCircle size={18} aria-hidden />
        {sending ? 'Sending…' : isSignedIn ? 'Send message' : 'Sign in to message'}
      </button>

      {(store.phone || store.whatsapp) && (
        <div className="ws-contact__direct">
          <span className="ws-label">Or reach them directly</span>

          <div className="ws-contact__row">
            {store.phone && (
              showPhone ? (
                <a href={`tel:${store.phone}`} className="ws-btn ws-btn--sm ws-btn--secondary ws-num">
                  <Phone size={14} aria-hidden />
                  {store.phone}
                </a>
              ) : (
                // Revealed on click rather than rendered outright — it keeps
                // the number away from casual scrapers and lets the platform
                // see that contact was made.
                <button className="ws-btn ws-btn--sm ws-btn--secondary" onClick={() => setShowPhone(true)}>
                  <Phone size={14} aria-hidden />
                  Show number
                </button>
              )
            )}

            {store.whatsapp && (
              <a
                className="ws-btn ws-btn--sm ws-btn--secondary"
                href={waLink(store.whatsapp, listing.name)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      <p className="ws-safety">
        <ShieldAlert size={16} aria-hidden />
        <span>
          WorldStreet does not handle payment or delivery for this item. Meet in
          a safe place and check the item before paying.
        </span>
      </p>
    </div>
  );
}
