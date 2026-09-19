import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Store } from 'lucide-react';
import { publicMarketplace, type PublicStore } from '@/features/stores/api';
import { useLocations } from '@/shared/hooks/useLocations';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import StoreCard from '@/features/stores/components/StoreCard';
import StoreCardSkeleton from '@/features/stores/components/StoreCardSkeleton';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const NO_STORES: PublicStore[] = [];

const GRID = {
  display: 'grid',
  gap: 'var(--ws-space-4)',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
} as const;

export default function StoresDirectory() {
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const { countryOf } = useLocations();
  const countryName = country ? (countryOf(country)?.name ?? country) : '';

  const filters = { page, limit: 24, ...(country ? { country } : {}), ...(state ? { state } : {}) };

  const query = useQuery({
    queryKey: queryKeys.stores(filters),
    queryFn: () => publicMarketplace.browseStores(filters),
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
  });

  const stores = query.isError ? NO_STORES : (query.data?.data ?? NO_STORES);
  const totalPages = query.data?.pagination.totalPages ?? 1;
  const loading = query.isPending;
  const refreshing = query.isFetching && !query.isPending;

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Stores</h1>
          <p className="ws-page__sub">Independent sellers on the marketplace — visit one to see everything they list.</p>
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
            aria-label="Filter stores by country"
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
              aria-label="Filter stores by state or region"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div style={GRID}>
          {Array.from({ length: 6 }, (_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Store size={26} aria-hidden /></div>
          <h2 className="ws-title">No stores yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            {state || country
              ? `No stores in ${state || countryName} yet — try another location.`
              : 'Be the first — open a store and start listing today.'}
          </p>
          {!state && !country && (
            <Link to="/vendor/register" className="ws-btn ws-btn--sm ws-btn--primary">
              Open a store
              <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            className={refreshing ? 'ws-busy' : undefined}
            aria-busy={refreshing || undefined}
            style={GRID}
          >
            {stores.map((s) => (
              <StoreCard key={s.id} store={s} />
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
