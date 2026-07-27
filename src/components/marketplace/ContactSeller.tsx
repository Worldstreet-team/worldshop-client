import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
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
      <div style={{ border: '1px solid #a6f4c5', background: '#ecfdf3', borderRadius: 8, padding: '1rem' }}>
        <strong style={{ color: '#027a48', display: 'block', marginBottom: 4 }}>Message sent</strong>
        <p style={{ color: '#475467', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          {store.name} has been notified. Replies appear in your messages.
        </p>
        <button className="btn-primary" onClick={() => navigate('/account/messages')}>
          Go to my messages
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Contact seller</h3>

      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={2000}
        style={{ width: '100%', padding: '0.6rem', border: '1px solid #e4e7ec', borderRadius: 6, marginBottom: '0.5rem' }}
      />

      <button className="btn-primary" onClick={handleSend} disabled={sending} style={{ width: '100%' }}>
        {sending ? 'Sending…' : isSignedIn ? 'Send message' : 'Sign in to message'}
      </button>

      {(store.phone || store.whatsapp) && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #f2f4f7', paddingTop: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#667085', marginBottom: '0.5rem' }}>
            Or reach them directly
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {store.phone && (
              showPhone ? (
                <a href={`tel:${store.phone}`} className="btn-secondary">{store.phone}</a>
              ) : (
                // Revealed on click rather than rendered outright — it keeps
                // the number away from casual scrapers and lets the platform
                // see that contact was made.
                <button className="btn-secondary" onClick={() => setShowPhone(true)}>
                  Show phone number
                </button>
              )
            )}

            {store.whatsapp && (
              <a
                className="btn-secondary"
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

      <p style={{ fontSize: '0.78rem', color: '#98a2b3', marginTop: '0.75rem', lineHeight: 1.4 }}>
        WorldStreet does not handle payment or delivery for this item. Meet in a
        safe place and check the item before paying.
      </p>
    </div>
  );
}
