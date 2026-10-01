import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/features/catalog/api';
import { publicMarketplace } from '@/features/stores/api';
import type { Category } from '@/features/catalog/types';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

const EMPTY: Category[] = [];

// The browse endpoint caps a page at 50. Twenty pages covers a thousand
// public listings; past that the counts would want a server endpoint.
const PAGE = 50;
const MAX_PAGES = 20;

/**
 * Public listings per category id, counted from the listings buyers can
 * actually reach.
 *
 * The category list's own `productCount` cannot be shown: the API counts
 * listings buyers never see in it (drafts, hidden ones, shops that are not
 * live), so a department read "Fashion (23)" and opened onto nothing.
 */
async function countPublicListings(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await publicMarketplace.browse({ page, limit: PAGE });
    for (const l of res.data) {
      if (l.categoryId) counts[l.categoryId] = (counts[l.categoryId] ?? 0) + 1;
    }
    if (page >= res.pagination.totalPages) break;
  }
  return counts;
}

export function useCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
    staleTime: 30 * MINUTE,
    gcTime: 60 * MINUTE,
  });

  const counts = useQuery({
    queryKey: [...queryKeys.categories(), 'public-counts'],
    queryFn: countPublicListings,
    staleTime: 5 * MINUTE,
  });

  // Every count the app shows reads productCount, so it is replaced here,
  // once. Until the real counts arrive the categories are not handed out at
  // all: showing the API's figure for a moment would flash the wrong number.
  // If counting fails, every category reads as empty rather than inflated.
  const categories = useMemo(() => {
    if (!query.data || (!counts.data && !counts.isError)) return EMPTY;
    const known = counts.data ?? {};
    return query.data.map((c) => ({ ...c, productCount: known[c.id] ?? 0 }));
  }, [query.data, counts.data, counts.isError]);

  return {
    categories,
    isLoading: query.isPending || counts.isPending,
    error: query.error,
  };
}
