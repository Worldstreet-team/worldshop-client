import { useQuery } from '@tanstack/react-query';
import { storeService } from '@/features/stores/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

/**
 * GET /stores/me/dashboard, shared: the vendor shell reads the store's name,
 * plan and unread count from it, and the Overview page reads everything else,
 * so both hit one cache entry instead of two requests.
 */
export function useVendorDashboard() {
  return useQuery({
    queryKey: queryKeys.vendorDashboard(),
    queryFn: () => storeService.getDashboard().then((res) => res.data),
    staleTime: MINUTE,
  });
}
