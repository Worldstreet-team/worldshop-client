import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import type { PublicStore } from '@/features/stores/api';
import { isVerifiedTier, replyTime, sinceLabel, VERIFICATION_LABEL } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

export default function StoreCard({ store }: { store: PublicStore }) {
  const location = formatLocation([store.city, store.state], store.country);
  const verified = isVerifiedTier(store.verificationTier);
  const since = sinceLabel(store.createdAt);
  // Only what the store actually has: an empty value ("No reviews", "—")
  // took a slot and a label for nothing and made the card read as a form.
  const reply =
    store.avgResponseMins != null
      ? `Replies ${replyTime(store.avgResponseMins)}`
      : store.responseRate != null
        ? `${Math.round(store.responseRate * 100)}% reply rate`
        : null;

  return (
    <Link to={`/stores/${store.slug}`} className="ws-storecard">
      <div className="ws-storecard__banner" aria-hidden>
        {store.banner && <img src={store.banner} alt="" loading="lazy" />}
      </div>

      <div className="ws-storecard__body">
        <div className="ws-storecard__head">
          <span className="ws-storecard__logo" aria-hidden>
            {store.logo ? <img src={store.logo} alt="" loading="lazy" /> : store.name.charAt(0).toUpperCase()}
          </span>
          {verified && (
            <span className="ws-storecard__tier">
              <BadgeCheck size={13} aria-hidden />
              {VERIFICATION_LABEL[store.verificationTier]}
            </span>
          )}
        </div>

        <h3 className="ws-storecard__name">{store.name}</h3>
        {(location || store.mall) && (
          <p className="ws-storecard__loc">
            {location && (
              <span className="ws-storecard__place">
                <MapPin size={12} aria-hidden />
                <span>{location}</span>
              </span>
            )}
            {store.mall && <span className="ws-storecard__mall">Part of {store.mall.name}</span>}
          </p>
        )}
        <p className="ws-storecard__desc">{store.description}</p>

        <p className="ws-storecard__meta">
          {store.reviewCount > 0 && (
            <span
              className="ws-num"
              aria-label={`Rated ${store.avgRating.toFixed(1)} out of 5 from ${store.reviewCount} review${store.reviewCount === 1 ? '' : 's'}`}
            >
              <Star size={12} aria-hidden className="ws-storecard__star" />
              <strong>{store.avgRating.toFixed(1)}</strong>
              <span aria-hidden>({store.reviewCount.toLocaleString()})</span>
            </span>
          )}
          <span className="ws-num">
            <strong>{store.listingCount.toLocaleString()}</strong> {store.listingCount === 1 ? 'listing' : 'listings'}
          </span>
          {reply && <span className="ws-num">{reply}</span>}
        </p>
      </div>

      <div className="ws-storecard__foot">
        {since && <span>Since {since}</span>}
        <span className="ws-storecard__cta">
          Visit store
          <ArrowRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
