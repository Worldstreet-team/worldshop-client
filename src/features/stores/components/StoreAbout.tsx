import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { PublicStore } from '@/features/stores/api';
import { waLink } from '@/features/listings/model';
import { isVerifiedTier, replyTime, sinceLabel, VERIFICATION_LABEL } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

type StoreAboutProps = {
  store: PublicStore;
  mall: { name: string; slug: string } | null;
  liveCount: number | null;
  onShowListings: () => void;
};

export default function StoreAbout({ store, mall, liveCount, onShowListings }: StoreAboutProps) {
  const location = formatLocation([store.address, store.city, store.state], store.country);
  const since = sinceLabel(store.createdAt);
  const verification = isVerifiedTier(store.verificationTier)
    ? VERIFICATION_LABEL[store.verificationTier]
    : 'Not yet verified';
  const count = liveCount ?? store.listingCount;

  const details: Array<{ label: string; value: ReactNode }> = [
    ...(location ? [{ label: 'Location', value: location }] : []),
    ...(mall ? [{ label: 'Mall', value: <Link to={`/malls/${mall.slug}`} className="ws-storehead__link">{mall.name}</Link> }] : []),
    { label: 'Verification', value: verification },
    ...(since ? [{ label: 'Selling since', value: since }] : []),
    ...(store.responseRate != null
      ? [{ label: 'Replies to', value: `${Math.round(store.responseRate * 100)}% of messages` }]
      : []),
    ...(store.avgResponseMins != null ? [{ label: 'Usually replies in', value: replyTime(store.avgResponseMins) }] : []),
    ...(store.whatsapp
      ? [{
          label: 'WhatsApp',
          value: (
            <a href={waLink(store.whatsapp)} target="_blank" rel="noopener noreferrer" className="ws-storehead__link">
              Message on WhatsApp
            </a>
          ),
        }]
      : []),
    ...(store.website
      ? [{
          label: 'Website',
          value: (
            <a href={store.website} target="_blank" rel="noopener noreferrer" className="ws-storehead__link">
              {store.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          ),
        }]
      : []),
  ];

  return (
    <div className="ws-storeabout">
      <div className="ws-storeabout__intro">
        {store.description ? (
          <p className="ws-profile__desc">{store.description}</p>
        ) : (
          <p className="ws-profile__desc ws-storeabout__blank">
            {store.name} hasn't written an introduction yet. Their listings say the most about what they sell.
          </p>
        )}

        {count > 0 && (
          <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onShowListings}>
            See {count === 1 ? 'the listing' : `all ${count.toLocaleString()} listings`}
            <ArrowRight size={14} aria-hidden />
          </button>
        )}

        <div className="ws-safety">
          <ShieldCheck size={16} aria-hidden />
          <span>WorldStore does not handle payment or delivery. Meet the seller and check items before paying.</span>
        </div>
      </div>

      <div className="ws-storeabout__details">
        <h3 className="ws-sectionhead__eyebrow">Store details</h3>
        <dl>
          {details.map((d) => (
            <div className="ws-spec__row" key={d.label}>
              <dt>{d.label}</dt>
              <dd>{d.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
