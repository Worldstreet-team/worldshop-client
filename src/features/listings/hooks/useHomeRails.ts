import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicMarketplace, type Listing, type PublicStore } from '@/features/stores/api';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import { resolveCategoryIds } from '@/features/catalog/model';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

export const RAIL_SIZE = 8;

type Row = Listing & { store: PublicStore };

const NO_ROWS: Row[] = [];
const RAIL_STALE = 5 * MINUTE;

export function useHomeRails() {
  const { categories } = useCategories();

  const vehiclesId = categories.find((c) => c.slug === 'vehicles' && !c.parentId)?.id ?? '';
  const vehicleIds = useMemo(
    () => (vehiclesId ? resolveCategoryIds(categories, vehiclesId) : []),
    [categories, vehiclesId],
  );

  const newest = useQuery({
    queryKey: queryKeys.listings({ limit: RAIL_SIZE }),
    queryFn: () => publicMarketplace.browse({ limit: RAIL_SIZE }),
    staleTime: RAIL_STALE,
  });

  const deals = useQuery({
    queryKey: queryKeys.listings({ maxPrice: 100000, limit: RAIL_SIZE }),
    queryFn: () => publicMarketplace.browse({ maxPrice: 100000, limit: RAIL_SIZE }),
    staleTime: RAIL_STALE,
  });

  const motors = useQuery({
    queryKey: queryKeys.listingsByCategories(vehicleIds, { limit: RAIL_SIZE }),
    queryFn: async () => {
      const groups = await Promise.all(
        vehicleIds.map((id) =>
          publicMarketplace
            .browse({ categoryId: id, limit: RAIL_SIZE })
            .then((res) => res.data)
            .catch(() => NO_ROWS),
        ),
      );
      const merged = new Map<string, Row>();
      for (const group of groups) for (const row of group) merged.set(row.id, row);
      return [...merged.values()]
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
        .slice(0, RAIL_SIZE);
    },
    enabled: vehicleIds.length > 0,
    staleTime: RAIL_STALE,
  });

  const newestRows = newest.data?.data ?? NO_ROWS;
  const dealRows = deals.data?.data ?? NO_ROWS;
  const motorRows = motors.data ?? NO_ROWS;

  const sellers = useMemo(() => {
    const seen = new Map<string, PublicStore>();
    for (const l of [...newestRows, ...motorRows, ...dealRows]) {
      if (l.store && !seen.has(l.store.id)) seen.set(l.store.id, l.store);
    }
    return [...seen.values()].slice(0, 4);
  }, [newestRows, motorRows, dealRows]);

  return {
    departments: useMemo(() => categories.filter((c) => !c.parentId), [categories]),
    vehiclesId,
    total: newest.data?.pagination.total ?? 0,
    newest: newestRows,
    deals: dealRows,
    motors: motorRows,
    sellers,
    loading: newest.isPending || deals.isPending,
    motorsLoading: vehicleIds.length === 0 || motors.isPending,
  };
}
