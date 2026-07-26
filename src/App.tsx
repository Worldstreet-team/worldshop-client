import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import AppRouter from '@/router';
import ClerkTokenProvider from '@/components/auth/ClerkTokenProvider';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/store/authStore';
import '@/styles/main.scss';

function App() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { syncClerkUser, clearUser } = useAuthStore();

  useEffect(() => {
  }, []);

  // Sync auth state when Clerk loads
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      // Always sync to get fresh profile data (including role changes)
      syncClerkUser();
    } else {
      clearUser();
    }
    // syncClerkUser/clearUser are stable store actions; depending on them
    // re-triggers the sync loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, userId]);

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <LoadingSpinner fullScreen size="lg" message="Loading WorldStreet..." />
    );
  }

  return (
    <ClerkTokenProvider>
      <AppRouter />
    </ClerkTokenProvider>
  );
}

export default App;
