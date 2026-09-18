import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { publicMarketplace, type Listing, type PublicStore } from '@/features/stores/api';
import type { Category } from '@/features/catalog/types';
import { resolveCategoryIds } from '@/features/catalog/model';
import { queryKeys } from '@/shared/lib/queryKeys';
import type { BrowseFilters } from './useBrowseFilters';

const PER_PAGE = 24;
const FANOUT_LIMIT = 200;

type Row = Listing & { store: PublicStore };

type BrowsePage = {
  rows: Row[];
  total: number;
  totalPages: number;
};

const EMPTY: BrowsePage = { rows: [], total: 0, totalPages: 1 };

function sortRows(rows: Row[], sort: string) {
  return rows.sort((a, b) => {
    if (sort === 'price_asc') return (a.basePrice ?? Infinity) - (b.basePrice ?? Infinity);
    if (sort === 'price_desc') return (b.basePrice ?? -Infinity) - (a.basePrice ?? -Infinity);
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  });
}

type BrowseQueryOptions = {
  queryKey: QueryKey;
  queryFn: () => Promise<BrowsePage>;
};

function browseOptions(
  baseQuery: Record<string, unknown>,
  categoryIds: string[],
  sort: string,
  page: number,
): BrowseQueryOptions {
  if (categoryIds.length <= 1) {
    const query: Record<string, unknown> = { ...baseQuery, page, limit: PER_PAGE };
    if (categoryIds[0]) query.categoryId = categoryIds[0];

    return {
      queryKey: queryKeys.listings(query),
      queryFn: async (): Promise<BrowsePage> => {
        const res = await publicMarketplace.browse(query);
        return { rows: res.data, total: res.pagination.total, totalPages: res.pagination.totalPages };
      },
    };
  }

  return {
    queryKey: queryKeys.listingsByCategories(categoryIds, { ...baseQuery, page }),
    queryFn: async (): Promise<BrowsePage> => {
      const groups = await Promise.all(
        categoryIds.map((id) =>
          publicMarketplace
            .browse({ ...baseQuery, categoryId: id, page: 1, limit: FANOUT_LIMIT })
            .then((res) => res.data)
            .catch(() => [] as Row[]),
        ),
      );

      const merged = new Map<string, Row>();
      for (const group of groups) for (const row of group) merged.set(row.id, row);
      const rows = sortRows([...merged.values()], sort);

      return {
        rows: rows.slice((page - 1) * PER_PAGE, page * PER_PAGE),
        total: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / PER_PAGE)),
      };
    },
  };
}

export function useBrowseListings(filters: BrowseFilters, categories: Category[]) {
  const {
    categoryId, countryFilter, stateFilter, condition, search, page, sort, minPrice, maxPrice, attrFilters,
  } = filters;
  const client = useQueryClient();

  const baseQuery = useMemo(() => {
    const query: Record<string, unknown> = {};
    if (countryFilter) query.country = countryFilter;
    if (stateFilter) query.state = stateFilter;
    if (condition) query.condition = condition;
    if (search) query.search = search;
    if (sort) query.sort = sort;
    if (minPrice) query.minPrice = minPrice;
    if (maxPrice) query.maxPrice = maxPrice;
    for (const [name, value] of Object.entries(attrFilters)) query[`attr.${name}`] = value;
    return query;
  }, [countryFilter, stateFilter, condition, search, sort, minPrice, maxPrice, attrFilters]);

  const categoryIds = useMemo(
    () => (categoryId ? resolveCategoryIds(categories, categoryId) : []),
    [categories, categoryId],
  );

  const waitingForCategories = Boolean(categoryId) && categories.length === 0;

  const query = useQuery({
    ...browseOptions(baseQuery, categoryIds, sort, page),
    enabled: !waitingForCategories,
    placeholderData: keepPreviousData,
  });

  const prefetchPage = useCallback(
    (target: number) => {
      if (waitingForCategories || target < 1) return;
      client.prefetchQuery(browseOptions(baseQuery, categoryIds, sort, target));
    },
    [client, baseQuery, categoryIds, sort, waitingForCategories],
  );

  const data = query.data ?? EMPTY;
  const failed = query.isError && !query.data;

  return {
    listings: failed ? EMPTY.rows : data.rows,
    total: data.total,
    totalPages: data.totalPages,
    loading: waitingForCategories || query.isPending,
    refreshing: query.isFetching && !query.isPending,
    failed,
    retry: () => { void query.refetch(); },
    prefetchPage,
  };
}
