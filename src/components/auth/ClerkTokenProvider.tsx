import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setClerkTokenGetter } from '@/services/api';

/**
 * Bridges Clerk's useAuth().getToken() into the axios interceptor.
 * Render this once near the top of the component tree (inside ClerkProvider).
 */
export default function ClerkTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(getToken);
  }, [getToken]);

  return <>{children}</>;
}
