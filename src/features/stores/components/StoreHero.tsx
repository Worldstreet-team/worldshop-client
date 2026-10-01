import { Link } from 'react-router-dom';
import { BadgeCheck, Check, MessagesSquare, Star, UserPlus } from 'lucide-react';
import type { PublicStore } from '@/features/stores/api';
import { isVerifiedTier, sinceLabel } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

/** "42 min", "2 hr", "3 days": the sandbox's "Replies in about …" without a tilde. */
function about(mins: number): string {
  if (mins < 60) return `${Math.max(1, Math.round(mins))} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} hr`;
  const days = Math.round(mins / (60 * 24));
  return `${days} day${days === 1 ? '' : 's'}`;
}

type StoreHeroProps = {
  store: PublicStore;
  /** Live listings, when the catalogue has been counted; the store's own figure otherwise. */
  listingCount: number;
  mall: { name: string; slug: string } | null;
  following: boolean;
  onMessage?: () => void;
  onFollow: () => void;
};

/**
 * The top of a store page, ported from the sandbox's seller header ("full"
 * variant): a cover, the avatar breaking out of it, name and badge, one line
 * of facts, the two actions, then a four-cell stat strip.
 */
export default function StoreHero({
  store,
  listingCount,
  mall,
  following,
  onMessage,
  onFollow,
}: StoreHeroProps) {
  const place = formatLocation([store.city, store.state], store.country);
  const joined = sinceLabel(store.createdAt);
  const facts = [
    place,
    joined && `Joined ${joined}`,
    store.avgResponseMins != null ? `Replies in about ${about(store.avgResponseMins)}` : 'New seller',
  ].filter(Boolean);

  const stats = [
    { label: 'Listings', value: listingCount.toLocaleString('en-NG') },
    {
      label: 'Response rate',
      value: store.responseRate != null ? `${Math.round(store.responseRate * 100)}%` : 'New',
    },
    {
      label: store.reviewCount > 0 ? `Rating · ${store.reviewCount.toLocaleString('en-NG')}` : 'Rating',
      value:
        store.reviewCount > 0 ? (
          <span className="ws-shero__rating">
            <Star size={16} aria-hidden className="ws-solid ws-ldstar" />
            {store.avgRating.toFixed(1)}
            <span className="ws-sr-only"> out of 5</span>
          </span>
        ) : (
          '—'
        ),
    },
    { label: 'Sales', value: store.itemsSold != null ? store.itemsSold.toLocaleString('en-NG') : '—' },
  ];

  return (
    <section aria-label={`Seller ${store.name}`} className="ws-shero">
      <div className={`ws-shero__cover${store.banner ? ' has-image' : ''}`}>
        {store.banner ? <img src={store.banner} alt="" /> : <div className="ws-shero__tint" />}
        <div aria-hidden className="ws-shero__scrim" />
      </div>

      <div className="ws-shero__body">
        <div className="ws-shero__row">
          <span className="ws-shero__avatar">
            {store.logo ? (
              <img src={store.logo} alt="" />
            ) : (
              <span aria-hidden>{store.name.charAt(0).toUpperCase()}</span>
            )}
          </span>

          <div className="ws-shero__id">
            <div className="ws-shero__nameline">
              <h1 className="ws-shero__name">{store.name}</h1>
              {isVerifiedTier(store.verificationTier) && (
                <span className="ws-ldbadge ws-ldbadge--success" role="img" aria-label="Verified seller badge">
                  <BadgeCheck size={12} aria-hidden className="ws-solid ws-solid--cut" />
                  Verified seller
                </span>
              )}
            </div>
            <p className="ws-shero__facts">
              {facts.join(' · ')}
              {/* Kept from the old header: a substore links back to its mall. */}
              {mall && (
                <>
                  {' · Part of '}
                  <Link to={`/malls/${mall.slug}`}>{mall.name}</Link>
                </>
              )}
            </p>
          </div>

          <div className="ws-shero__actions">
            {onMessage && (
              <button
                type="button"
                className="ws-ldbtn ws-ldbtn--primary"
                aria-label={`Message ${store.name}`}
                onClick={onMessage}
              >
                <MessagesSquare size={16} aria-hidden className="ws-solid" />
                Message seller
              </button>
            )}
            <button
              type="button"
              className={`ws-ldbtn ${following ? 'ws-ldbtn--outline' : 'ws-ldbtn--tonal'}`}
              aria-pressed={following}
              aria-label={`Follow ${store.name}`}
              onClick={onFollow}
            >
              {following ? <Check size={16} aria-hidden /> : <UserPlus size={16} aria-hidden />}
              {following ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        <dl className="ws-shero__stats">
          {stats.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
