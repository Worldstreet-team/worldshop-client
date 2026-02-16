import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToRegister } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnUrlParam = searchParams.get('returnUrl');
  const returnUrl = returnUrlParam
    ? `${window.location.origin}${returnUrlParam}`
    : window.location.origin;

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Already signed in, redirect to home
      navigate('/', { replace: true });
    } else {
      // Not signed in, redirect to external register
      redirectToRegister(returnUrl);
    }
  }, [isLoaded, isSignedIn, redirectToRegister, returnUrl, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      fontSize: '1.1rem',
      color: '#666',
    }}>
      Redirecting to register...
    </div>
  );
}
