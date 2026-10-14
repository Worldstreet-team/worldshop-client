import { useQuery } from '@tanstack/react-query';
import { publicMalls } from '@/features/malls/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

/**
 * Whether any mall is live, for the buyer-facing "Malls" links. A link to a
 * directory that says "No malls yet" to every visitor reads as a platform
 * nobody uses, so the links stay hidden until there is something behind them.
 *
 * False while loading as well as when empty: the header pill would otherwise
 * render and then vanish on every first visit while there are none. The seller
 * side ("Open a mall") is unaffected; that is how the first mall gets made.
 */
export function useHasMalls(): boolean {
  const query = useQuery({
    queryKey: queryKeys.malls({ limit: 1 }),
    queryFn: () => publicMalls.browse({ limit: 1 }),
    staleTime: 10 * MINUTE,
  });
  return (query.data?.pagination.total ?? 0) > 0;
}
