import { Link } from 'react-router-dom';
import type { PublicStore } from '@/services/storeService';

/**
 * Seller summary.
 *
 * With no transaction on the platform, these four signals are all a buyer has
 * to judge a seller by — so they are shown together rather than scattered:
 * verification, rating, how often they reply, and how fast.
 */

const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: '',
  EMAIL_VERIFIED: 'Email verified',
  ID_VERIFIED: 'ID verified',
  BUSINESS_VERIFIED: 'Business verified',
};

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
    <div style={{ border: '1px solid #e4e7ec', borderRadius: 8, padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {store.logo ? (
          <img src={store.logo} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f2f4f7', display: 'grid', placeItems: 'center', color: '#667085', fontWeight: 700 }}>
            {store.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <Link to={`/stores/${store.slug}`} style={{ fontWeight: 600, display: 'block' }}>
            {store.name}
          </Link>
          <div style={{ fontSize: '0.8rem', color: '#667085' }}>
            {[store.city, store.state].filter(Boolean).join(', ')}
          </div>
        </div>
      </div>

      {verification && (
        <div style={{ marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ecfdf3', color: '#027a48', padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600 }}>
          <span className="material-icons" style={{ fontSize: '0.9rem' }}>verified</span>
          {verification}
        </div>
      )}

      <dl style={{ margin: '0.85rem 0 0', display: 'grid', gap: '0.35rem', fontSize: '0.86rem' }}>
        {store.reviewCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <dt style={{ color: '#667085' }}>Rating</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {store.avgRating.toFixed(1)} ★ ({store.reviewCount})
            </dd>
          </div>
        )}

        {/* The signal a seller cannot fake: unanswered threads count against it. */}
        {store.responseRate != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <dt style={{ color: '#667085' }}>Replies to</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{Math.round(store.responseRate * 100)}% of messages</dd>
          </div>
        )}

        {replyTime && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <dt style={{ color: '#667085' }}>Usually replies in</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{replyTime}</dd>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <dt style={{ color: '#667085' }}>Listings</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{store.listingCount}</dd>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <dt style={{ color: '#667085' }}>On WorldStreet since</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{memberSince}</dd>
        </div>
      </dl>

      <Link to={`/stores/${store.slug}`} className="btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: '0.85rem' }}>
        View all listings
      </Link>
    </div>
  );
}
