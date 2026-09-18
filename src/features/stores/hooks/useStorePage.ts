import { useCallback } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { publicMarketplace, type Listing } from '@/features/stores/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const PER_PAGE = 24;
const NO_ROWS: Listing[] = [];

function listingsOptions(slug: string, page: number) {
  return {
    queryKey: queryKeys.storeListings(slug, page),
    queryFn: () => publicMarketplace.getStoreListings(slug, { page, limit: PER_PAGE }),
    staleTime: 2 * MINUTE,
  };
}

export function useStorePage(slug: string | undefined, page: number) {
  const client = useQueryClient();

  const storeQuery = useQuery({
    queryKey: queryKeys.store(slug ?? ''),
    queryFn: () => publicMarketplace.getStore(slug as string).then((res) => res.data),
    enabled: Boolean(slug),
    staleTime: 5 * MINUTE,
  });

  const listingsQuery = useQuery({
    ...listingsOptions(slug ?? '', page),
    enabled: Boolean(slug),
    placeholderData: keepPreviousData,
  });

  const prefetchPage = useCallback(
    (target: number) => {
      if (!slug || target < 1) return;
      client.prefetchQuery(listingsOptions(slug, target));
    },
    [client, slug],
  );

  return {
    store: storeQuery.data ?? null,
    notFound: storeQuery.isError,
    listings: listingsQuery.data?.data ?? NO_ROWS,
    total: listingsQuery.data?.pagination.total ?? 0,
    totalPages: listingsQuery.data?.pagination.totalPages ?? 1,
    loading: listingsQuery.isPending,
    refreshing: listingsQuery.isFetching && !listingsQuery.isPending,
    prefetchPage,
  };
}
