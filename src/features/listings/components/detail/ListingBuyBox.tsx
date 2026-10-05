import { useState, useSyncExternalStore, type RefObject } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {
  Check, Clock, Heart, MapPin, MessageCircle, MessagesSquare, Share2, ShieldCheck, Star, Tag,
  TriangleAlert, Truck, Zap,
} from 'lucide-react';
import type { PublicListing, ListingVariant } from '@/features/stores/api';
import ContactSeller, { type ContactSellerHandle } from '@/features/stores/components/ContactSeller';
import { fmtNaira, priceLabel, timeAgo, waLink } from '@/features/listings/model';
import { savedListings, toggleSaved } from '@/features/listings/savedListings';

/** At or under this many, the count is worth a badge. Above it, it is just stock. */
const LOW_STOCK = 5;
const PAY_LATER_PARTS = 4;

/** "Deal ends today", "Deal ends tomorrow", "Deal ends in 5 days", counted in calendar days. */
function dealEnds(iso: string): string {
  const end = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(end) - startOf(new Date())) / 86_400_000);
  if (days <= 0) return 'Deal ends today';
  if (days === 1) return 'Deal ends tomorrow';
  return `Deal ends in ${days} days`;
}

function priceHint(l: PublicListing): string {
  if (l.priceType === 'ON_REQUEST') return 'No public price. Ask the seller for one.';
  if (l.priceType === 'RANGE') return 'Price depends on the option you choose.';
  return l.isNegotiable ? 'Asking price. The seller takes offers.' : 'Fixed price set by the seller.';
}

const variantLabel = (v: ListingVariant, i: number) =>
  v.name || Object.values(v.attributes ?? {}).join(' / ') || `Option ${i + 1}`;

type ListingBuyBoxProps = {
  listing: PublicListing;
  location: string;
  /** Owned by the page, because the seller card and the mobile bar open the same composer. */
  contact: RefObject<ContactSellerHandle | null>;
};

export default function ListingBuyBox({ listing, location, contact }: ListingBuyBoxProps) {
  const { isSignedIn } = useAuth();
  const [copied, setCopied] = useState(false);
  const [variant, setVariant] = useState<number | null>(null);
  const saved = useSyncExternalStore(savedListings.subscribe, () => savedListings.has(listing.id));
  const store = listing.store;
  const chosen = variant != null ? listing.variants[variant] : null;
  const subject = chosen ? `${listing.name} (${variantLabel(chosen, variant ?? 0)})` : listing.name;
  const titleId = `${listing.id}-title`;

  // One number to buy at, when there is one: the chosen option's, else a fixed
  // asking price. A range or "contact for price" has nothing to split or discount.
  const price = chosen?.price ?? (listing.priceType === 'FIXED' ? listing.basePrice : null);
  const was = !chosen && price != null && listing.compareAtPrice != null && listing.compareAtPrice > price
    ? listing.compareAtPrice
    : null;
  const off = was != null && price != null ? Math.round((1 - price / was) * 100) : 0;
  const lowStock = listing.stockLeft != null && listing.stockLeft > 0 && listing.stockLeft <= LOW_STOCK;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: listing.name, url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="ws-ldbuy" aria-labelledby={titleId}>
      <div className="ws-ldbuy__head">
        {(lowStock || off > 0) && (
          <div className="ws-ldbuy__badges">
            {lowStock && (
              <span className="ws-ldbadge ws-ldbadge--warning">
                <TriangleAlert size={12} aria-hidden className="ws-solid ws-solid--cut" />
                Only {listing.stockLeft} left
              </span>
            )}
            {off > 0 && (
              <span className="ws-ldbadge ws-ldbadge--sale">
                <Tag size={12} aria-hidden className="ws-solid ws-solid--cut" />
                −{off}%
              </span>
            )}
          </div>
        )}

        <h1 className="ws-ldbuy__title" id={titleId}>{listing.name}</h1>

        <p className="ws-ldbuy__meta">
          {store.reviewCount > 0 ? (
            <a href="#reviews" className="ws-ldbuy__rating">
              <Star size={16} aria-hidden className="ws-solid ws-ldstar" />
              <span className="ws-ldbuy__score ws-num">{store.avgRating.toFixed(1)}</span>
              <span className="ws-ldbuy__count">
                ({store.reviewCount.toLocaleString()} {store.reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </a>
          ) : (
            <span>No reviews yet</span>
          )}
          {location && (
            <span>
              <MapPin size={16} aria-hidden className="ws-solid ws-solid--cut" />
              {location}
            </span>
          )}
          {listing.publishedAt && (
            <span>
              <Clock size={16} aria-hidden className="ws-solid ws-solid--cut" />
              Listed {timeAgo(listing.publishedAt)}
            </span>
          )}
        </p>
      </div>

      <div className="ws-ldbuy__pricing">
        <p className="ws-ldbuy__price">
          <span className="ws-ldbuy__now ws-num">
            <span className="ws-sr-only">Price: </span>
            {chosen?.price != null ? fmtNaira(chosen.price) : priceLabel(listing)}
          </span>
          {was != null && (
            <span className="ws-ldbuy__was ws-num">
              <span className="ws-sr-only">Was </span>
              {fmtNaira(was)}
            </span>
          )}
        </p>
        {was != null && listing.dealEndsAt && (
          <p className="ws-ldbuy__deal">{dealEnds(listing.dealEndsAt)}</p>
        )}
        {price != null && (
          <p className="ws-ldbuy__later">
            or {PAY_LATER_PARTS} × <strong className="ws-num">{fmtNaira(Math.round(price / PAY_LATER_PARTS))}</strong>{' '}
            with WorldStreet Pay Later
          </p>
        )}
        <p className="ws-ldbuy__later">{priceHint(listing)}</p>
      </div>

      {listing.variants.length > 0 && (
        <div className="ws-ldbuy__options">
          <span className="ws-label">
            Options{chosen && <span className="ws-ldbuy__chosen"> · {variantLabel(chosen, variant ?? 0)}</span>}
          </span>
          <div className="ws-chiprow" role="group" aria-label="Available options">
            {listing.variants.map((v, i) => (
              <button
                key={v.id ?? i}
                type="button"
                className="ws-chip"
                aria-pressed={variant === i}
                disabled={v.isAvailable === false}
                onClick={() => setVariant(variant === i ? null : i)}
              >
                {variantLabel(v, i)}
                {v.price != null && <span className="ws-chip__count ws-num">{fmtNaira(v.price)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* There is no checkout behind these yet. Each opens the conversation
          with the seller, with an opening line that says which one was pressed. */}
      <div className="ws-ldbuy__actions">
        <button
          type="button"
          className="ws-ldbtn ws-ldbtn--primary"
          onClick={() => contact.current?.start(`Hi, I would like to buy "${subject}". Is it still available?`)}
        >
          <Zap size={18} aria-hidden className="ws-solid" />
          Buy now
        </button>

        <div className="ws-ldbuy__row">
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--outline"
            onClick={() => contact.current?.start(`Hi, I would like to make an offer on "${subject}": ₦`)}
          >
            Make offer
          </button>
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--outline"
            onClick={() => contact.current?.start(`Hi, is "${subject}" still available?`)}
          >
            <MessagesSquare size={18} aria-hidden className="ws-solid" />
            Message
          </button>
          <button
            type="button"
            className={`ws-ldbtn ws-ldbtn--outline ws-ldbtn--icon${saved ? ' is-saved' : ''}`}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
            onClick={() => toggleSaved(listing)}
          >
            <Heart size={18} aria-hidden className={saved ? 'ws-solid' : undefined} />
          </button>
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--outline ws-ldbtn--icon"
            aria-label="Share listing"
            title={copied ? 'Link copied' : 'Share'}
            onClick={share}
          >
            {copied ? <Check size={18} aria-hidden /> : <Share2 size={18} aria-hidden />}
          </button>
        </div>

        {store.whatsapp && (
          <a
            href={waLink(store.whatsapp, `Hi, is "${listing.name}" still available?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-ldbtn ws-ldbtn--outline"
          >
            <MessageCircle size={18} aria-hidden />
            WhatsApp the seller
          </a>
        )}

        {!isSignedIn && (
          <p className="ws-ldbuy__note">
            A free account lets the seller reply to you. Signing in brings you back here.
          </p>
        )}
      </div>

      <div id="contact-panel" className="ws-ldbuy__contact">
        <ContactSeller ref={contact} listing={listing} subject={subject} cta={false} />
      </div>

      <ul className="ws-ldbuy__trust">
        {listing.delivery && (
          <li>
            <Truck size={16} aria-hidden className="ws-solid" />
            <span>
              <strong>{listing.delivery.label}</strong>
              <span>{listing.delivery.note}</span>
            </span>
          </li>
        )}
        <li>
          <ShieldCheck size={16} aria-hidden className="ws-solid ws-solid--cut" />
          <span>
            <strong>Buyer protection</strong>
            <span>Your payment is held until you confirm delivery.</span>
          </span>
        </li>
      </ul>
    </section>
  );
}
