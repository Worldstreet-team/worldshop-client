import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Store } from 'lucide-react';
import { publicMarketplace, type PublicStore } from '@/features/stores/api';
import { useDirectoryFilters } from '@/shared/hooks/useDirectoryFilters';
import { useFilterDrawer } from '@/shared/hooks/useFilterDrawer';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import StoreCard from '@/features/stores/components/StoreCard';
import DirectoryHeader from '@/features/stores/components/directory/DirectoryHeader';
import DirectoryFilters from '@/features/stores/components/directory/DirectoryFilters';
import DirectoryResults from '@/features/stores/components/directory/DirectoryResults';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const NO_STORES: PublicStore[] = [];

export default function StoresDirectory() {
  const filters = useDirectoryFilters();
  const drawer = useFilterDrawer();
  usePageTitle(filters.place ? `Stores in ${filters.place}` : 'Stores');

  const query = useQuery({
    queryKey: queryKeys.stores(filters.query),
    queryFn: () => publicMarketplace.browseStores(filters.query),
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
  });

  return (
    <div className="ws-wrap">
      <DirectoryHeader id="stores-title" title="Stores" place={filters.place} />

      <div className="ws-browse">
        <DirectoryFilters
          filters={filters}
          noun="stores"
          total={query.data?.pagination.total ?? 0}
          open={drawer.open}
          onClose={() => drawer.setOpen(false)}
        />

        <div className="ws-directory">
          <DirectoryResults
            noun={['store', 'stores']}
            items={query.isError ? NO_STORES : (query.data?.data ?? NO_STORES)}
            total={query.data?.pagination.total ?? 0}
            totalPages={query.data?.pagination.totalPages ?? 1}
            page={filters.page}
            loading={query.isPending}
            refreshing={query.isFetching && !query.isPending}
            failed={query.isError}
            place={filters.place}
            tokens={filters.tokens}
            renderItem={(s) => <StoreCard store={s} />}
            empty={{
              Icon: Store,
              title: 'No stores yet',
              copy: 'Be the first: open a store and start listing today.',
              action: (
                <Link to="/vendor/register" className="ws-btn ws-btn--sm ws-btn--primary">
                  Open a store
                  <ArrowRight size={14} aria-hidden />
                </Link>
              ),
            }}
            onRetry={() => query.refetch()}
            onPage={filters.setPage}
            onClearAll={filters.clearAll}
            onOpenFilters={() => drawer.setOpen(true)}
            filtersOpen={drawer.open}
          />
        </div>
      </div>
    </div>
  );
}
