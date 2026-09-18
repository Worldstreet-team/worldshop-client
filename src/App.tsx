import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import AppRouter from '@/app/router';
import ClerkTokenProvider from '@/app/providers/ClerkTokenProvider';
import QueryProvider from '@/app/providers/QueryProvider';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { useAuthStore } from '@/features/auth/store/authStore';
import '@/styles/main.scss';

function App() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { syncClerkUser, clearUser } = useAuthStore();

   useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
           syncClerkUser();
    } else {
      clearUser();
    }
          // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, userId]);

   if (!isLoaded) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ClerkTokenProvider>
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </ClerkTokenProvider>
  );
}

export default App;
