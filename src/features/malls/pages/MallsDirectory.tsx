import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2 } from 'lucide-react';
import { publicMalls, type PublicMall } from '@/features/malls/api';
import { useDirectoryFilters } from '@/shared/hooks/useDirectoryFilters';
import { useFilterDrawer } from '@/shared/hooks/useFilterDrawer';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import MallCard from '@/features/malls/components/MallCard';
import MallCallout from '@/features/malls/components/MallCallout';
import DirectoryHeader from '@/features/stores/components/directory/DirectoryHeader';
import DirectoryFilters from '@/features/stores/components/directory/DirectoryFilters';
import DirectoryResults from '@/features/stores/components/directory/DirectoryResults';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const NO_MALLS: PublicMall[] = [];

export default function MallsDirectory() {
  const filters = useDirectoryFilters();
  const drawer = useFilterDrawer();
  usePageTitle(filters.place ? `Malls in ${filters.place}` : 'Malls');

  const query = useQuery({
    queryKey: queryKeys.malls(filters.query),
    queryFn: () => publicMalls.browse(filters.query),
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
  });

  return (
    <div className="ws-wrap">
      <DirectoryHeader id="malls-title" title="Malls" place={filters.place} />

      <div className="ws-browse">
        <DirectoryFilters
          filters={filters}
          noun="malls"
          total={query.data?.pagination.total ?? 0}
          open={drawer.open}
          onClose={() => drawer.setOpen(false)}
        />

        <div className="ws-directory">
          <div>
            <MallCallout />

            <DirectoryResults
              noun={['mall', 'malls']}
              items={query.isError ? NO_MALLS : (query.data?.data ?? NO_MALLS)}
              total={query.data?.pagination.total ?? 0}
              totalPages={query.data?.pagination.totalPages ?? 1}
              page={filters.page}
              loading={query.isPending}
              refreshing={query.isFetching && !query.isPending}
              failed={query.isError}
              place={filters.place}
              tokens={filters.tokens}
              renderItem={(m) => <MallCard mall={m} />}
              empty={{
                Icon: Building2,
                title: 'No malls yet',
                copy: 'Be the first: a mall gives your storefronts a shared home here.',
                action: (
                  <Link to="/mall/register" className="ws-btn ws-btn--sm ws-btn--primary">
                    Create your mall
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
    </div>
  );
}
