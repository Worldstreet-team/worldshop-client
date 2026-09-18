import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/features/chat/api';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';

export function useUnreadCount(isAuthenticated: boolean) {
  const query = useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: () => chatService.unread().then((res) => res.data.total),
    enabled: isAuthenticated,
    staleTime: MINUTE,
    refetchOnWindowFocus: true,
  });

  return isAuthenticated ? (query.data ?? 0) : 0;
}
