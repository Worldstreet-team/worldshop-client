import { Link } from 'react-router-dom';
import { BadgeCheck, MessagesSquare, Star, Trophy, Zap } from 'lucide-react';
import type { PublicStore, StoreBadge } from '@/features/stores/api';
import { timeAgo } from '@/features/listings/model';
import { isVerifiedTier } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

const BADGES: Record<StoreBadge, { label: string; Icon: typeof Trophy }> = {
  TOP_RATED: { label: 'Top rated', Icon: Trophy },
  FAST_SHIPPER: { label: 'Fast shipper', Icon: Zap },
};

/** "Within 45 min", "Within 2 hr", "Within 3 days": the reply promise as a ceiling. */
function within(mins: number): string {
  if (mins < 60) return `Within ${Math.max(1, Math.round(mins))} min`;
  if (mins < 60 * 24) return `Within ${Math.round(mins / 60)} hr`;
  const days = Math.round(mins / (60 * 24));
  return `Within ${days} day${days === 1 ? '' : 's'}`;
}

/** Tenure in the largest unit that fits: "5 years", "7 months", "3 weeks". */
function tenure(iso: string): string | null {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return null;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (days >= 365) return plural(Math.floor(days / 365), 'year');
  if (days >= 30) return plural(Math.floor(days / 30), 'month');
  if (days >= 7) return plural(Math.floor(days / 7), 'week');
  return days === 0 ? 'Joined today' : plural(days, 'day');
}

type SellerCardProps = {
  store: PublicStore;
  onMessage: () => void;
};

export default function SellerCard({ store, onMessage }: SellerCardProps) {
  const place = formatLocation([store.city, store.state], store.country);
  const active = store.lastActiveAt ? `Active ${timeAgo(store.lastActiveAt)}` : null;
  const since = tenure(store.createdAt);
  const replies = [
    store.avgResponseMins != null ? within(store.avgResponseMins) : null,
    store.responseRate != null ? `${Math.round(store.responseRate * 100)}%` : null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="ws-ldseller" aria-label={`About the seller, ${store.name}`}>
      <div className="ws-ldseller__id">
        <span className="ws-ldseller__avatar">
          {store.logo ? <img src={store.logo} alt={store.name} /> : store.name.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="ws-ldeyebrow">Sold by</p>
          <h2 className="ws-ldseller__name">{store.name}</h2>
          <p className="ws-ldseller__where">{[place, active].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      {(isVerifiedTier(store.verificationTier) || (store.badges?.length ?? 0) > 0) && (
        <div className="ws-ldseller__badges">
          {isVerifiedTier(store.verificationTier) && (
            <span className="ws-ldbadge ws-ldbadge--success">
              <BadgeCheck size={12} aria-hidden className="ws-solid ws-solid--cut" />
              Verified seller
            </span>
          )}
          {store.badges?.map((b) => {
            const { label, Icon } = BADGES[b];
            return (
              <span key={b} className="ws-ldbadge ws-ldbadge--info">
                <Icon size={12} aria-hidden className="ws-solid" />
                {label}
              </span>
            );
          })}
        </div>
      )}

      <dl className="ws-ldrows ws-ldrows--tight">
        <div>
          <dt>Rating</dt>
          <dd>
            {store.reviewCount > 0 ? (
              <span className="ws-ldseller__rating ws-num">
                <Star size={14} aria-hidden className="ws-solid ws-ldstar" />
                {store.avgRating.toFixed(1)} · {store.reviewCount.toLocaleString()}
              </span>
            ) : (
              'New seller'
            )}
          </dd>
        </div>
        {replies && (
          <div>
            <dt>Replies</dt>
            <dd>{replies}</dd>
          </div>
        )}
        {store.itemsSold != null && (
          <div>
            <dt>Items sold</dt>
            <dd className="ws-num">{store.itemsSold.toLocaleString()}</dd>
          </div>
        )}
        {since && (
          <div>
            <dt>On WorldStore</dt>
            <dd>{since}</dd>
          </div>
        )}
      </dl>

      <div className="ws-ldseller__actions">
        <button
          type="button"
          className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline"
          aria-label={`Message ${store.name}`}
          onClick={onMessage}
        >
          <MessagesSquare size={16} aria-hidden className="ws-solid" />
          Message
        </button>
        <Link
          to={`/stores/${store.slug}`}
          className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost"
          aria-label={`View ${store.name}'s shop`}
        >
          View shop
        </Link>
      </div>
    </section>
  );
}
