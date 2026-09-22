import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { publicMarketplace, type Listing } from '@/features/stores/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const PER_PAGE = 24;
const CATALOGUE_LIMIT = 100;
const NO_ROWS: Listing[] = [];

export type StoreListingFilters = { page: number; search: string; categoryId: string };
export type StoreCategory = { id: string; name: string; count: number };

function listingsOptions(slug: string, { page, search, categoryId }: StoreListingFilters) {
  const params = {
    page,
    limit: PER_PAGE,
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
  return {
    queryKey: queryKeys.storeListings(slug, params),
    queryFn: () => publicMarketplace.getStoreListings(slug, params),
    staleTime: 2 * MINUTE,
  };
}

export function useStorePage(slug: string | undefined, filters: StoreListingFilters) {
  const client = useQueryClient();
  const enabled = Boolean(slug);

  const storeQuery = useQuery({
    queryKey: queryKeys.store(slug ?? ''),
    queryFn: () => publicMarketplace.getStore(slug as string).then((res) => res.data),
    enabled,
    staleTime: 5 * MINUTE,
  });

  const listingsQuery = useQuery({
    ...listingsOptions(slug ?? '', filters),
    enabled,
    placeholderData: keepPreviousData,
  });

  // There is no per-store category endpoint, so the chips come from one wide
  // unfiltered read of the catalogue — stores are small enough for that.
  const catalogueQuery = useQuery({
    queryKey: queryKeys.storeCatalogue(slug ?? ''),
    queryFn: () => publicMarketplace.getStoreListings(slug as string, { page: 1, limit: CATALOGUE_LIMIT }),
    enabled,
    staleTime: 5 * MINUTE,
  });

  const categories = useMemo<StoreCategory[]>(() => {
    const byId = new Map<string, StoreCategory>();
    for (const l of catalogueQuery.data?.data ?? NO_ROWS) {
      if (!l.category) continue;
      const hit = byId.get(l.category.id);
      if (hit) hit.count += 1;
      else byId.set(l.category.id, { id: l.category.id, name: l.category.name, count: 1 });
    }
    return [...byId.values()].sort((a, b) => b.count - a.count);
  }, [catalogueQuery.data]);

  const prefetchPage = useCallback(
    (target: number) => {
      if (!slug || target < 1) return;
      client.prefetchQuery(listingsOptions(slug, { ...filters, page: target }));
    },
    [client, slug, filters],
  );

  return {
    store: storeQuery.data ?? null,
    notFound: storeQuery.isError,
    listings: listingsQuery.data?.data ?? NO_ROWS,
    total: listingsQuery.data?.pagination.total ?? 0,
    totalPages: Math.max(1, listingsQuery.data?.pagination.totalPages ?? 1),
    loading: listingsQuery.isPending,
    refreshing: listingsQuery.isFetching && !listingsQuery.isPending,
    failed: listingsQuery.isError,
    retry: () => listingsQuery.refetch(),
    catalogueTotal: catalogueQuery.data?.pagination.total ?? null,
    categories,
    prefetchPage,
  };
}
