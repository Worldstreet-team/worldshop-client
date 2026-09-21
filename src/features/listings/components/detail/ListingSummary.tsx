import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Eye, Heart, MapPin, Share2, Tag } from 'lucide-react';
import type { Listing, PublicStore } from '@/features/stores/api';
import { savedListings } from '@/features/listings/savedListings';
import { priceLabel } from '@/features/listings/model';

function postedAgo(iso: string): string | null {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

/**
 * There is no checkout, so the price is a starting point for a conversation.
 * Say what kind of number it is rather than leaving buyers to guess.
 */
function priceHint(l: Listing): string {
  if (l.priceType === 'ON_REQUEST') return 'The seller has not set a public price. Ask them in a message.';
  if (l.priceType === 'RANGE') {
    return l.isNegotiable
      ? 'The price depends on the option you choose, and the seller is open to offers.'
      : 'The price depends on the option you choose. Ask the seller which one applies.';
  }
  return l.isNegotiable
    ? 'Asking price. The seller is open to offers.'
    : 'Fixed price set by the seller.';
}

type ListingSummaryProps = {
  listing: Listing & { store: PublicStore };
  location: string;
};

/** Everything a buyer decides on at a glance: what, how much, where, how fresh. */
export default function ListingSummary({ listing, location }: ListingSummaryProps) {
  const [copied, setCopied] = useState(false);
  const saved = useSyncExternalStore(savedListings.subscribe, () => savedListings.has(listing.id));
  const ago = listing.publishedAt ? postedAgo(listing.publishedAt) : null;
  const condition = listing.condition
    ? listing.condition.charAt(0) + listing.condition.slice(1).toLowerCase()
    : null;

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
    <div className="ws-card ws-summary">
      <div className="ws-summary__top">
        {listing.category ? (
          <Link
            to={`/listings?categoryId=${listing.category.id}`}
            className="ws-hero__eyebrow ws-summary__eyebrow"
          >
            {listing.category.name}
          </Link>
        ) : (
          <span className="ws-hero__eyebrow ws-summary__eyebrow">Listing</span>
        )}

        <div className="ws-detail__acts">
          <button
            type="button"
            className={`ws-iconbtn${saved ? ' is-saved' : ''}`}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
            title={saved ? 'Saved' : 'Save'}
            onClick={() => savedListings.toggle(listing)}
          >
            <Heart size={18} />
          </button>
          <button
            type="button"
            className="ws-iconbtn"
            aria-label="Share listing"
            title={copied ? 'Link copied' : 'Share'}
            onClick={share}
          >
            {copied ? <Check size={18} /> : <Share2 size={18} />}
          </button>
        </div>
      </div>

      <h1 className="ws-summary__title">{listing.name}</h1>

      <div className="ws-detail__price">
        <span className="ws-price ws-price--lg">{priceLabel(listing)}</span>
        {listing.isNegotiable && listing.priceType !== 'ON_REQUEST' && (
          <span className="ws-badge ws-badge--warning">Negotiable</span>
        )}
      </div>

      <p className="ws-summary__pricehint">{priceHint(listing)}</p>

      <dl className="ws-summary__facts">
        {condition && (
          <div>
            <dt><Tag size={14} aria-hidden /> Condition</dt>
            <dd>{condition}</dd>
          </div>
        )}
        {location && (
          <div>
            <dt><MapPin size={14} aria-hidden /> Item location</dt>
            <dd>{location}</dd>
          </div>
        )}
        {ago && (
          <div>
            <dt><Clock size={14} aria-hidden /> Posted</dt>
            <dd>{ago}</dd>
          </div>
        )}
        {listing.viewCount > 0 && (
          <div>
            <dt><Eye size={14} aria-hidden /> Interest</dt>
            <dd>
              Viewed <span className="ws-num">{listing.viewCount.toLocaleString('en-NG')}</span>{' '}
              {listing.viewCount === 1 ? 'time' : 'times'}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
