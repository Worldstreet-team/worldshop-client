import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, MapPin, Store } from 'lucide-react';
import { publicMalls, type PublicMall } from '@/features/malls/api';
import { formatLocation } from '@/shared/utils/locations';
import { useLocations } from '@/shared/hooks/useLocations';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import MallCallout from '@/features/malls/components/MallCallout';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const NO_MALLS: PublicMall[] = [];

function MallCard({ mall }: { mall: PublicMall }) {
  const location = formatLocation([mall.city, mall.state], mall.country);

  return (
    <Link to={`/malls/${mall.slug}`} className="ws-storecard">
      <div className="ws-storecard__banner" aria-hidden>
        {mall.banner ? <img src={mall.banner} alt="" loading="lazy" /> : <Building2 size={22} />}
      </div>

      <div className="ws-storecard__body">
        <span className="ws-avatar ws-avatar--l ws-storecard__logo" aria-hidden>
          {mall.logo ? <img src={mall.logo} alt="" /> : mall.name.charAt(0).toUpperCase()}
        </span>

        <h3 className="ws-storecard__name">{mall.name}</h3>
        {location && (
          <p className="ws-storecard__loc">
            <MapPin size={12} aria-hidden style={{ verticalAlign: -1, marginRight: 4 }} />
            {location}
          </p>
        )}

        <p className="ws-storecard__stats ws-num">
          <Store size={13} aria-hidden />
          {mall.substoreCount} store{mall.substoreCount === 1 ? '' : 's'}
        </p>

        <span className="ws-storecard__cta">
          Visit mall
          <ArrowRight size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function MallsDirectory() {
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const { countryOf } = useLocations();
  const countryName = country ? (countryOf(country)?.name ?? country) : '';

  const filters = { page, limit: 24, ...(country ? { country } : {}), ...(state ? { state } : {}) };

  const query = useQuery({
    queryKey: queryKeys.malls(filters),
    queryFn: () => publicMalls.browse(filters),
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
  });

  const malls = query.isError ? NO_MALLS : (query.data?.data ?? NO_MALLS);
  const totalPages = query.data?.pagination.totalPages ?? 1;
  const loading = query.isPending;
  const refreshing = query.isFetching && !query.isPending;

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Malls</h1>
          <p className="ws-page__sub">Shopping destinations with multiple stores under one roof.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ws-space-2)' }}>
          <CountrySelect
            style={{ maxWidth: 220 }}
            value={country}
            placeholder="All countries"
            onChange={(e) => {
              setPage(1);
              setCountry(e.target.value);
              setState('');
            }}
            aria-label="Filter malls by country"
          />
          {country && (
            <StateSelect
              style={{ maxWidth: 220 }}
              country={country}
              value={state}
              placeholder={`All of ${countryName}`}
              onChange={(e) => {
                setPage(1);
                setState(e.target.value);
              }}
              aria-label="Filter malls by state or region"
            />
          )}
        </div>
      </div>

      <MallCallout />

      {loading ? (
        <div
          style={{
            display: 'grid', gap: 'var(--ws-space-4)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ws-skeleton" style={{ height: 220, borderRadius: 'var(--ws-radius-xl)' }} />
          ))}
        </div>
      ) : malls.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Building2 size={26} aria-hidden /></div>
          <h2 className="ws-title">No malls yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            {state || country
              ? `No malls in ${state || countryName} yet — try another location.`
              : 'Be the first — a mall gives your storefronts a shared home here.'}
          </p>
          {!state && !country && (
            <Link to="/mall/register" className="ws-btn ws-btn--sm ws-btn--primary">
              Create your mall
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            className={refreshing ? 'ws-busy' : undefined}
            aria-busy={refreshing || undefined}
            style={{
              display: 'grid', gap: 'var(--ws-space-4)',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            {malls.map((m) => (
              <MallCard key={m.id} mall={m} />
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-2)',
                marginTop: 'var(--ws-space-6)',
              }}
            >
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="ws-caption ws-muted ws-num" style={{ alignSelf: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
