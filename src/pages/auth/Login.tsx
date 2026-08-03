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

  // This page never renders a form — it hands off to the identity hub — so the
  // only state it has is "on the way there".
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 'var(--ws-space-3)' }} role="status">
      <span className="ws-spinner" style={{ fontSize: 24 }} aria-hidden="true" />
      <p className="ws-body ws-muted">Redirecting to sign in…</p>
    </div>
  );
}
