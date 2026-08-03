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

  // Like Login, this is a hand-off to the identity hub rather than a real form.
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--ws-space-3)' }} role="status">
      <span className="ws-spinner" style={{ fontSize: 24 }} aria-hidden="true" />
      <p className="ws-body ws-muted">Redirecting to sign up…</p>
    </div>
  );
}
