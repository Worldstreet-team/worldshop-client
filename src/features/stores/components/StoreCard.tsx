import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import type { PublicStore } from '@/features/stores/api';
import { isVerifiedTier, sinceLabel, VERIFICATION_LABEL } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

function replyTime(mins: number): string {
  if (mins < 60) return `~${Math.max(1, Math.round(mins))} min`;
  if (mins < 60 * 24) return `~${Math.round(mins / 60)} hr`;
  const days = Math.round(mins / (60 * 24));
  return `~${days} day${days === 1 ? '' : 's'}`;
}

export default function StoreCard({ store }: { store: PublicStore }) {
  const location = formatLocation([store.city, store.state], store.country);
  const verified = isVerifiedTier(store.verificationTier);
  const since = sinceLabel(store.createdAt);
  const reply =
    store.avgResponseMins != null
      ? { label: 'Replies in', value: replyTime(store.avgResponseMins) }
      : store.responseRate != null
        ? { label: 'Reply rate', value: `${Math.round(store.responseRate * 100)}%` }
        : { label: 'Replies in', value: '—' };

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

        <dl className="ws-storecard__stats">
          <div>
            {store.reviewCount > 0 ? (
              <>
                <dt>
                  {store.reviewCount.toLocaleString()} review{store.reviewCount === 1 ? '' : 's'}
                </dt>
                <dd className="ws-num" aria-label={`Rated ${store.avgRating.toFixed(1)} out of 5`}>
                  <Star size={12} aria-hidden className="ws-storecard__star" />
                  {store.avgRating.toFixed(1)}
                </dd>
              </>
            ) : (
              <>
                <dt>No reviews</dt>
                <dd className="ws-storecard__muted">New</dd>
              </>
            )}
          </div>
          <div>
            <dt>{store.listingCount === 1 ? 'Listing' : 'Listings'}</dt>
            <dd className="ws-num">{store.listingCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>{reply.label}</dt>
            <dd className={`ws-num${reply.value === '—' ? ' ws-storecard__muted' : ''}`}>{reply.value}</dd>
          </div>
        </dl>
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
