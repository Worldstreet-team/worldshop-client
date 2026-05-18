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
    // Generate session ID for guest cart if not exists
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', crypto.randomUUID());
    }
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
  }, [isLoaded, isSignedIn, userId]); // Removed syncClerkUser, clearUser from deps to avoid re-triggering

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
