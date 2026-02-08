import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const location = useLocation();
  const { isAuthenticated, redirectToLogin } = useAuthStore();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const returnUrl = from
    ? `${window.location.origin}${from}`
    : window.location.origin;

  useEffect(() => {
    if (!isAuthenticated) {
      redirectToLogin(returnUrl);
    }
  }, [isAuthenticated, redirectToLogin, returnUrl]);

  // If already authenticated, render nothing — router will handle navigation
  if (isAuthenticated) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      fontSize: '1.1rem',
      color: '#666',
    }}>
      Redirecting to login...
    </div>
  );
}
