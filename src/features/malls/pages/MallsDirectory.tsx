import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2 } from 'lucide-react';
import { publicMalls, type PublicMall } from '@/features/malls/api';
import { useDirectoryFilters } from '@/shared/hooks/useDirectoryFilters';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import MallCard from '@/features/malls/components/MallCard';
import MallCallout from '@/features/malls/components/MallCallout';
import DirectoryHero from '@/features/stores/components/directory/DirectoryHero';
import DirectoryResults from '@/features/stores/components/directory/DirectoryResults';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const NO_MALLS: PublicMall[] = [];

export default function MallsDirectory() {
  const filters = useDirectoryFilters();
  usePageTitle(filters.place ? `Malls in ${filters.place}` : 'Malls');

  const query = useQuery({
    queryKey: queryKeys.malls(filters.query),
    queryFn: () => publicMalls.browse(filters.query),
    placeholderData: keepPreviousData,
    staleTime: 5 * MINUTE,
  });

  return (
    <>
      <DirectoryHero
        id="malls-title"
        eyebrow="Destinations"
        title="Malls"
        sub="Several stores under one roof. Browse a mall's storefronts and featured picks in one place."
        noun="malls"
        filters={filters}
      />

      <div className="ws-wrap">
        <div className="ws-directory">
          {/* One block with the results, so the callout keeps its own tight
              spacing above them: it is the mall product's only way in. */}
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
            />
          </div>
        </div>
      </div>
    </>
  );
}
