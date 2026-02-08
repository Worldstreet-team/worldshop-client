import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isInitialized, user, redirectToLogin } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Only redirect after auth has been initialized
    if (isInitialized && !isAuthenticated) {
      // Redirect to external login page with return URL
      const returnUrl = `${window.location.origin}${location.pathname}${location.search}`;
      redirectToLogin(returnUrl);
    }
  }, [isAuthenticated, isInitialized, redirectToLogin, location]);

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

  // Don't render if not authenticated (will redirect via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'ADMIN') {
    // User is authenticated but not an admin
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
