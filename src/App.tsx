import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import AppRouter from '@/router';
import ClerkTokenProvider from '@/components/auth/ClerkTokenProvider';
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
      syncClerkUser();
    } else {
      clearUser();
    }
  }, [isLoaded, isSignedIn, userId, syncClerkUser, clearUser]);

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <ClerkTokenProvider>
      <AppRouter />
    </ClerkTokenProvider>
  );
}

export default App;
