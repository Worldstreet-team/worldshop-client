import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized, tokens, error, redirectToLogin } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Only redirect after auth has been initialized AND no tokens exist at all
    if (isInitialized && !isAuthenticated && !tokens?.accessToken) {
      const returnUrl = `${window.location.origin}${location.pathname}${location.search}`;
      console.log('🔒 ProtectedRoute: No tokens found. Redirecting to login...');
      redirectToLogin(returnUrl);
    }
  }, [isAuthenticated, isInitialized, tokens, redirectToLogin, location]);

  // Show loading state while waiting for auth initialization
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

  // If tokens exist but auth service was unreachable, show an error instead of redirecting
  if (!isAuthenticated && tokens?.accessToken) {
    console.warn('⚠️ ProtectedRoute: Has tokens but not verified (auth service unreachable?)');
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center' as const,
      }}>
        <p style={{ fontSize: '1.1rem', color: '#666' }}>
          Unable to verify your session. The authentication service may be temporarily unavailable.
        </p>
        {error && <p style={{ fontSize: '0.9rem', color: '#999' }}>{error}</p>}
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: '#fff',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // No tokens at all — will redirect via useEffect above
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
