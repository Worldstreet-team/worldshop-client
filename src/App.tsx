import { useEffect } from 'react';
import AppRouter from '@/router';
import { useAuthStore } from '@/store/authStore';
import '@/styles/main.scss';

function App() {
  const { initializeAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    // Initialize authentication on app load
    // This will:
    // 1. Get access token from cookies
    // 2. Verify token with external auth service
    // 3. If invalid, try to refresh using refresh token
    // 4. If refresh fails, redirect to login (only for protected pages)
    initializeAuth();

    // Generate session ID for guest cart if not exists
    if (!localStorage.getItem('sessionId')) {
      localStorage.setItem('sessionId', crypto.randomUUID());
    }
  }, [initializeAuth]);

  // Show loading state while initializing auth
  if (!isInitialized) {
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

  return <AppRouter />;
}

export default App;
