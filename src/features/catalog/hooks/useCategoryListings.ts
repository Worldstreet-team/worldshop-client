import { useQuery } from '@tanstack/react-query';
import { publicMarketplace } from '@/features/stores/api';
import type { CategoryRow } from '@/features/catalog/categoryFilters';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

// Per section. The page filters and counts on the client, so it needs the rows
// rather than a page of them; past this a section would want server paging.
const LIMIT = 200;
const NO_ROWS: CategoryRow[] = [];

/**
 * Every listing filed under the given sections, newest first.
 *
 * One request per section, because the API matches a single categoryId
 * exactly and listings only ever file under a section (see
 * resolveCategoryIds), so asking for a department by its own id finds nothing.
 */
export function useCategoryListings(categoryIds: string[]) {
  const query = useQuery({
    queryKey: queryKeys.listingsByCategories(categoryIds, { limit: LIMIT }),
    queryFn: async () => {
      const groups = await Promise.all(
        categoryIds.map((id) =>
          publicMarketplace.browse({ categoryId: id, page: 1, limit: LIMIT }).then((r) => r.data),
        ),
      );
      const merged = new Map<string, CategoryRow>();
      for (const group of groups) for (const row of group) merged.set(row.id, row);
      return [...merged.values()].sort((a, b) =>
        (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
      );
    },
    enabled: categoryIds.length > 0,
    staleTime: 5 * MINUTE,
  });

  return {
    rows: query.data ?? NO_ROWS,
    loading: categoryIds.length > 0 && query.isPending,
    failed: query.isError && !query.data,
    retry: () => void query.refetch(),
  };
}
