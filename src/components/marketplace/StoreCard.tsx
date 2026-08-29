import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Star, Store } from 'lucide-react';
import type { PublicStore } from '@/services/storeService';
import { isVerifiedTier } from '@/utils/sellerVerification';

/**
 * Seller spotlight for the home page: banner with an overlapping avatar, one
 * stat line, one reply line. SellerCard (the label-heavy trust panel on the
 * listing detail page) stays as it is — this is a poster, not a fact sheet.
 */

function replyLine(rate: number | null, mins: number | null): string | null {
  if (rate == null) return null;
  const speed =
    mins == null ? null
    : mins < 60 ? `~${mins} min`
    : mins < 60 * 24 ? `~${Math.round(mins / 60)} hr`
    : `~${Math.round(mins / (60 * 24))} days`;
  // responseRate is a 0–1 fraction (see SellerCard), not a percentage.
  return `Replies to ${Math.round(rate * 100)}% of messages${speed ? ` · ${speed}` : ''}`;
}

export default function StoreCard({ store }: { store: PublicStore }) {
  const location = [store.city, store.state].filter(Boolean).join(', ');
  const reply = replyLine(store.responseRate, store.avgResponseMins);

  return (
    <Link to={`/stores/${store.slug}`} className="ws-storecard">
      <div className="ws-storecard__banner" aria-hidden>
        {store.banner ? <img src={store.banner} alt="" loading="lazy" /> : <Store size={22} />}
      </div>

      <div className="ws-storecard__body">
        <span className="ws-avatar ws-avatar--l ws-storecard__logo" aria-hidden>
          {store.logo ? <img src={store.logo} alt="" /> : store.name.charAt(0).toUpperCase()}
        </span>

        <h3 className="ws-storecard__name">
          {store.name}
          {isVerifiedTier(store.verificationTier) && (
            <BadgeCheck size={15} aria-label="Verified store" />
          )}
        </h3>
        {location && <p className="ws-storecard__loc">{location}</p>}

        <p className="ws-storecard__stats ws-num">
          {store.reviewCount > 0 && (
            <>
              {/* Rating-star orange, per the DS convention. */}
              <Star size={13} aria-hidden />
              {store.avgRating.toFixed(1)}
              <span className="ws-storecard__dim">({store.reviewCount})</span>
              <span aria-hidden>·</span>
            </>
          )}
          {store.listingCount} listing{store.listingCount === 1 ? '' : 's'}
        </p>
        {reply && <p className="ws-storecard__reply">{reply}</p>}

        <span className="ws-storecard__cta">
          Visit store
          <ArrowRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
