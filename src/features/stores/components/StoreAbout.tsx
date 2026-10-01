import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck } from 'lucide-react';
import type { PublicStore } from '@/features/stores/api';
import { waLink } from '@/features/listings/model';
import { isVerifiedTier, replyTime, sinceLabel, VERIFICATION_LABEL } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

type StoreAboutProps = {
  store: PublicStore;
  mall: { name: string; slug: string } | null;
};

/**
 * The shop's About tab. The copy and the two-line trust list are the
 * sandbox's; the details list under them is what the page carried before,
 * including the contacts that used to sit in the header.
 */
export default function StoreAbout({ store, mall }: StoreAboutProps) {
  const [showPhone, setShowPhone] = useState(false);
  const place = formatLocation([store.city, store.state], store.country);
  const address = formatLocation([store.address, store.city, store.state], store.country);
  const since = sinceLabel(store.createdAt);
  const verification = isVerifiedTier(store.verificationTier)
    ? VERIFICATION_LABEL[store.verificationTier]
    : 'Not yet verified';

  const details: Array<{ label: string; value: ReactNode }> = [
    ...(address ? [{ label: 'Address', value: address }] : []),
    ...(mall ? [{ label: 'Mall', value: <Link to={`/malls/${mall.slug}`}>{mall.name}</Link> }] : []),
    { label: 'Verification', value: verification },
    ...(since ? [{ label: 'Selling since', value: since }] : []),
    ...(store.avgResponseMins != null
      ? [{ label: 'Usually replies in', value: replyTime(store.avgResponseMins) }]
      : []),
    ...(store.whatsapp
      ? [{
          label: 'WhatsApp',
          value: (
            <a href={waLink(store.whatsapp, `Hi, I found ${store.name} on WorldStore.`)} target="_blank" rel="noopener noreferrer">
              Message on WhatsApp
            </a>
          ),
        }]
      : []),
    ...(store.phone
      ? [{
          label: 'Phone',
          value: showPhone ? (
            <a href={`tel:${store.phone}`} className="ws-num">{store.phone}</a>
          ) : (
            <button type="button" className="ws-shopabout__reveal" onClick={() => setShowPhone(true)}>
              Show number
            </button>
          ),
        }]
      : []),
    ...(store.website
      ? [{
          label: 'Website',
          value: (
            <a href={store.website} target="_blank" rel="noopener noreferrer">
              {store.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          ),
        }]
      : []),
  ];

  return (
    <div className="ws-shopabout">
      {store.description ? (
        <p className="ws-ldcopy">{store.description}</p>
      ) : (
        <p className="ws-shopabout__blank">
          {store.name} has not written a shop description yet. What is known is on the listings
          themselves: condition, location and delivery are stated on each one.
        </p>
      )}

      <ul className="ws-shopabout__trust">
        <li>
          <ShieldCheck size={16} aria-hidden className="ws-shopabout__ok" />
          <span>
            <span className="ws-shopabout__head">Escrow on every order</span>
            <span className="ws-shopabout__sub">
              Money is held by WorldStreet until the buyer confirms, whatever this shop sells.
            </span>
          </span>
        </li>
        {place && (
          <li>
            <MapPin size={16} aria-hidden className="ws-shopabout__pin" />
            <span>
              <span className="ws-shopabout__head">{place}</span>
              <span className="ws-shopabout__sub">Where this shop ships and meets from.</span>
            </span>
          </li>
        )}
      </ul>

      <dl className="ws-ldrows ws-shopabout__details">
        {details.map((d) => (
          <div key={d.label}>
            <dt>{d.label}</dt>
            <dd>{d.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
