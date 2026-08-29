import { Link } from 'react-router-dom';
import { BadgeCheck, Star, MessageSquare, Clock, Package, CalendarDays } from 'lucide-react';
import type { PublicStore } from '@/services/storeService';
import { VERIFICATION_LABEL } from '@/utils/sellerVerification';

/**
 * Seller summary.
 *
 * With no transaction on the platform, these four signals are all a buyer has
 * to judge a seller by — so they are shown together rather than scattered:
 * verification, rating, how often they reply, and how fast.
 */

function responseTime(mins: number | null): string | null {
  if (mins == null) return null;
  if (mins < 60) return `~${mins} min`;
  if (mins < 60 * 24) return `~${Math.round(mins / 60)} hr`;
  return `~${Math.round(mins / (60 * 24))} days`;
}

export default function SellerCard({ store }: { store: PublicStore }) {
  const verification = VERIFICATION_LABEL[store.verificationTier] ?? '';
  const replyTime = responseTime(store.avgResponseMins);
  const memberSince = new Date(store.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' });

  return (
    <div className="ws-card">
      <Link to={`/stores/${store.slug}`} className="ws-sellerrow">
        <span className="ws-avatar ws-avatar--l" style={{ width: 44, height: 44 }}>
          {store.logo
            ? <img src={store.logo} alt="" />
            : store.name.charAt(0).toUpperCase()}
        </span>

        <span style={{ minWidth: 0 }}>
          <span className="ws-title" style={{ display: 'block' }}>{store.name}</span>
          <span className="ws-caption ws-subtle">
            {[store.city, store.state].filter(Boolean).join(', ')}
          </span>
        </span>
      </Link>

      {verification && (
        <span className="ws-badge ws-badge--success" style={{ marginTop: 'var(--ws-space-3)' }}>
          <BadgeCheck size={12} aria-hidden />
          {verification}
        </span>
      )}

      <dl className="ws-trust">
        {store.reviewCount > 0 && (
          <div className="ws-trust__row">
            <dt><Star size={14} aria-hidden /> Rating</dt>
            <dd>{store.avgRating.toFixed(1)} ({store.reviewCount})</dd>
          </div>
        )}

        {/* The signal a seller cannot fake: unanswered threads count against it. */}
        {store.responseRate != null && (
          <div className="ws-trust__row">
            <dt><MessageSquare size={14} aria-hidden /> Replies to</dt>
            <dd>{Math.round(store.responseRate * 100)}% of messages</dd>
          </div>
        )}

        {replyTime && (
          <div className="ws-trust__row">
            <dt><Clock size={14} aria-hidden /> Usually replies in</dt>
            <dd>{replyTime}</dd>
          </div>
        )}

        {store.listingCount != null && (
          <div className="ws-trust__row">
            <dt><Package size={14} aria-hidden /> Listings</dt>
            <dd>{store.listingCount}</dd>
          </div>
        )}

        <div className="ws-trust__row">
          <dt><CalendarDays size={14} aria-hidden /> Selling since</dt>
          <dd>{memberSince}</dd>
        </div>
      </dl>

      <Link
        to={`/stores/${store.slug}`}
        className="ws-btn ws-btn--sm ws-btn--secondary ws-btn--block"
        style={{ marginTop: 'var(--ws-space-4)' }}
      >
        View all listings
      </Link>
    </div>
  );
}
