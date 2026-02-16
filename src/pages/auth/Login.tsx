import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToLogin } = useAuthStore();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const returnUrlParam = searchParams.get('returnUrl');
  const returnUrl = returnUrlParam
    ? `${window.location.origin}${returnUrlParam}`
    : from
      ? `${window.location.origin}${from}`
      : window.location.origin;

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Already signed in, redirect to return URL or home
      navigate(returnUrlParam || from || '/', { replace: true });
    } else {
      // Not signed in, redirect to external login
      redirectToLogin(returnUrl);
    }
  }, [isLoaded, isSignedIn, redirectToLogin, returnUrl, navigate, from, returnUrlParam]);

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
