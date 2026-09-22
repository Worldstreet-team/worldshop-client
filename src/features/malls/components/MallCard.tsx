import { Link } from 'react-router-dom';
import { ArrowRight, Building2, MapPin, Store } from 'lucide-react';
import type { PublicMall } from '@/features/malls/api';
import { sinceLabel } from '@/features/stores/model';
import { formatLocation } from '@/shared/utils/locations';

export default function MallCard({ mall }: { mall: PublicMall }) {
  const location = formatLocation([mall.city, mall.state], mall.country);
  const since = sinceLabel(mall.createdAt);

  return (
    <Link to={`/malls/${mall.slug}`} className="ws-storecard">
      <div className="ws-storecard__banner" aria-hidden>
        {mall.banner && <img src={mall.banner} alt="" loading="lazy" />}
      </div>

      <div className="ws-storecard__body">
        <div className="ws-storecard__head">
          <span className="ws-storecard__logo" aria-hidden>
            {mall.logo ? <img src={mall.logo} alt="" loading="lazy" /> : <Building2 size={22} />}
          </span>
          <span className="ws-storecard__kind">
            <Building2 size={12} aria-hidden />
            Mall
          </span>
        </div>

        <h3 className="ws-storecard__name">{mall.name}</h3>
        <p className="ws-storecard__loc">
          {location && (
            <span className="ws-storecard__place">
              <MapPin size={12} aria-hidden />
              <span>{location}</span>
            </span>
          )}
        </p>

        <p className="ws-storecard__desc">{mall.description}</p>

        <dl className="ws-storecard__stats ws-storecard__stats--2">
          <div>
            <dt>{mall.substoreCount === 1 ? 'Store' : 'Stores'}</dt>
            <dd className="ws-num">
              <Store size={12} aria-hidden className="ws-storecard__glyph" />
              {mall.substoreCount.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Opened</dt>
            <dd className={since ? undefined : 'ws-storecard__muted'}>{since ?? '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="ws-storecard__foot">
        <span className="ws-storecard__cta">
          Visit mall
          <ArrowRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
