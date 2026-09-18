import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { publicMarketplace } from '@/features/stores/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

export function useListingPrefetch() {
  const client = useQueryClient();

  return useCallback(
    (idOrSlug: string) => {
      if (!idOrSlug) return;
      client.prefetchQuery({
        queryKey: queryKeys.listing(idOrSlug),
        queryFn: () => publicMarketplace.getListing(idOrSlug).then((res) => res.data),
        staleTime: 2 * MINUTE,
      });
    },
    [client],
  );
}
