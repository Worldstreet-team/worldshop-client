import { useEffect, useState } from 'react';
import { chatService } from '@/features/chat/api';

export function useUnreadCount(isAuthenticated: boolean) {
  const [unreadTotal, setUnreadTotal] = useState(0);

    useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    chatService.unread()
      .then((res) => { if (!cancelled) setUnreadTotal(res.data.total); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const unread = isAuthenticated ? unreadTotal : 0;

  return unread;
}
