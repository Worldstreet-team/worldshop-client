import { useEffect, useState } from 'react';
import { publicMarketplace, type Listing, type PublicStore } from '@/features/stores/api';
import type { Category } from '@/features/catalog/types';
import { resolveCategoryIds } from '@/features/catalog/model';
import type { BrowseFilters } from './useBrowseFilters';

const PER_PAGE = 24;

export function useBrowseListings(filters: BrowseFilters, categories: Category[]) {
  const {
    categoryId, countryFilter, stateFilter, condition, search, page, sort, minPrice, maxPrice, attrFilters,
  } = filters;

  const [listings, setListings] = useState<Array<Listing & { store: PublicStore }>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

    const fetchKey = [
    page, categoryId, countryFilter, stateFilter, condition, search, sort, minPrice, maxPrice,
    JSON.stringify(attrFilters), retryTick,
  ].join('|');
  const loading = loadedKey !== fetchKey;

  useEffect(() => {
    let cancelled = false;

    const baseQuery: Record<string, unknown> = {};
    if (countryFilter) baseQuery.country = countryFilter;
    if (stateFilter) baseQuery.state = stateFilter;
    if (condition) baseQuery.condition = condition;
    if (search) baseQuery.search = search;
    if (sort) baseQuery.sort = sort;
    if (minPrice) baseQuery.minPrice = minPrice;
    if (maxPrice) baseQuery.maxPrice = maxPrice;
    for (const [name, value] of Object.entries(attrFilters)) baseQuery[`attr.${name}`] = value;

    const finish = (rows: Array<Listing & { store: PublicStore }>, count: number, pages: number) => {
      if (cancelled) return;
      setListings(rows);
      setTotal(count);
      setTotalPages(pages);
      setFailed(false);
    };

    const categoryIds = categoryId ? resolveCategoryIds(categories, categoryId) : [];

    if (categoryIds.length <= 1) {
                const query: Record<string, unknown> = { ...baseQuery, page, limit: PER_PAGE };
      if (categoryIds[0]) query.categoryId = categoryIds[0];

      publicMarketplace
        .browse(query)
        .then((res) => finish(res.data, res.pagination.total, res.pagination.totalPages))
        .catch(() => {
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoadedKey(fetchKey);
        });
    } else {
                                    Promise.all(
        categoryIds.map((id) =>
          publicMarketplace
            .browse({ ...baseQuery, categoryId: id, page: 1, limit: 200 })
            .then((res) => res.data)
            .catch(() => [] as Array<Listing & { store: PublicStore }>),
        ),
      )
        .then((groups) => {
          if (cancelled) return;
          const merged = new Map<string, Listing & { store: PublicStore }>();
          for (const group of groups) for (const l of group) merged.set(l.id, l);
          const rows = [...merged.values()].sort((a, b) => {
            if (sort === 'price_asc') return (a.basePrice ?? Infinity) - (b.basePrice ?? Infinity);
            if (sort === 'price_desc') return (b.basePrice ?? -Infinity) - (a.basePrice ?? -Infinity);
            return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
          });
          const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
          finish(rows.slice((page - 1) * PER_PAGE, page * PER_PAGE), rows.length, pages);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoadedKey(fetchKey);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [page, categoryId, categories, countryFilter, stateFilter, condition, search, sort, minPrice, maxPrice, attrFilters, retryTick, fetchKey]);

  return { listings, total, totalPages, loading, failed, retry: () => setRetryTick((n) => n + 1) };
}
