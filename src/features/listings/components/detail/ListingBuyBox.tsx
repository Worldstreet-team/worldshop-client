import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck, Check, ChevronRight, Clock, Heart, MapPin, MessageCircle, Share2, Star,
} from 'lucide-react';
import type { PublicListing, ListingVariant } from '@/features/stores/api';
import ContactSeller from '@/features/stores/components/ContactSeller';
import Stars from '@/features/reviews/components/Stars';
import { fmtNaira, priceLabel, waLink } from '@/features/listings/model';
import { savedListings } from '@/features/listings/savedListings';
import { isVerifiedTier, replyTime, VERIFICATION_LABEL } from '@/features/stores/model';

function priceHint(l: PublicListing): string {
  if (l.priceType === 'ON_REQUEST') return 'No public price — ask the seller for one.';
  if (l.priceType === 'RANGE') return 'Price depends on the option you choose.';
  return l.isNegotiable ? 'Asking price — the seller takes offers.' : 'Fixed price set by the seller.';
}

const variantLabel = (v: ListingVariant, i: number) =>
  v.name || Object.values(v.attributes ?? {}).join(' / ') || `Option ${i + 1}`;

type ListingBuyBoxProps = {
  listing: PublicListing;
  location: string;
  onSeeReviews: () => void;
};

export default function ListingBuyBox({ listing, location, onSeeReviews }: ListingBuyBoxProps) {
  const [copied, setCopied] = useState(false);
  const [variant, setVariant] = useState<number | null>(null);
  const saved = useSyncExternalStore(savedListings.subscribe, () => savedListings.has(listing.id));
  const store = listing.store;
  const verified = isVerifiedTier(store.verificationTier);
  const reply = store.avgResponseMins != null ? replyTime(store.avgResponseMins) : null;
  const condition = listing.condition
    ? listing.condition.charAt(0) + listing.condition.slice(1).toLowerCase()
    : null;
  const rating = listing.avgRating ?? 0;
  const reviews = listing.reviewCount ?? 0;
  const chosen = variant != null ? listing.variants[variant] : null;

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
    <div className="ws-buybox">
      <div className="ws-buybox__head">
        <h1 className="ws-buybox__title">{listing.name}</h1>
        <div className="ws-buybox__acts">
          <button
            type="button"
            className={`ws-iconbtn${saved ? ' is-saved' : ''}`}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save listing'}
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

      <div className="ws-buybox__rating">
        {reviews > 0 ? (
          <button type="button" className="ws-buybox__ratinglink" onClick={onSeeReviews}>
            <Stars value={rating} size={14} />
            <span className="ws-num">{rating.toFixed(1)}</span>
            <span>
              ({reviews.toLocaleString()} {reviews === 1 ? 'review' : 'reviews'})
            </span>
          </button>
        ) : (
          <span className="ws-buybox__noreviews">No reviews yet</span>
        )}
        {condition && <span className="ws-badge ws-badge--neutral">{condition}</span>}
      </div>

      <div className="ws-buybox__price">
        <span className="ws-price ws-price--lg">
          {chosen?.price != null ? fmtNaira(chosen.price) : priceLabel(listing)}
        </span>
        {listing.isNegotiable && listing.priceType !== 'ON_REQUEST' && (
          <span className="ws-badge ws-badge--warning">Negotiable</span>
        )}
      </div>
      <p className="ws-buybox__hint">{priceHint(listing)}</p>

      {listing.variants.length > 0 && (
        <div className="ws-buybox__options">
          <span className="ws-label">
            Options{chosen && <span className="ws-buybox__chosen"> · {variantLabel(chosen, variant ?? 0)}</span>}
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

      {location && (
        <p className="ws-buybox__where">
          <MapPin size={14} aria-hidden />
          <span>{location}</span>
        </p>
      )}

      <div className="ws-buybox__cta" id="contact-panel">
        <ContactSeller
          listing={listing}
          subject={chosen ? `${listing.name} (${variantLabel(chosen, variant ?? 0)})` : listing.name}
        />
        {store.whatsapp && (
          <a
            href={waLink(store.whatsapp, `Hi, is "${listing.name}" still available?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="ws-btn ws-btn--secondary ws-btn--block"
          >
            <MessageCircle size={18} aria-hidden />
            WhatsApp the seller
          </a>
        )}
      </div>

      <Link to={`/stores/${store.slug}`} className="ws-sellerline ws-buybox__seller">
        <span className="ws-avatar ws-sellerline__avatar" aria-hidden>
          {store.logo ? <img src={store.logo} alt="" /> : store.name.charAt(0).toUpperCase()}
        </span>
        <span className="ws-sellerline__id">
          <span className="ws-sellerline__name">
            {store.name}
            {verified && (
              <BadgeCheck
                size={14}
                aria-label={VERIFICATION_LABEL[store.verificationTier]}
                className="ws-sellerline__tick"
              />
            )}
          </span>
          <span className="ws-sellerline__meta">
            {store.reviewCount > 0 ? (
              <>
                <Star size={12} aria-hidden className="ws-storecard__star" />
                <span className="ws-num">{store.avgRating.toFixed(1)}</span>
                <span>({store.reviewCount})</span>
              </>
            ) : (
              <span>New seller</span>
            )}
            {reply && (
              <>
                <span aria-hidden>·</span>
                <Clock size={12} aria-hidden />
                <span>Replies in {reply}</span>
              </>
            )}
          </span>
        </span>
        <ChevronRight size={18} aria-hidden className="ws-sellerline__go" />
      </Link>
    </div>
  );
}
