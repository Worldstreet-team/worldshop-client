import { useAuth } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { GateLoading, GateBlocked } from './RouteGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) return <GateLoading />;

  // A prompt rather than an auto-redirect, so a shared or mistyped URL does not
  // silently bounce someone away from the page they were trying to reach.
  if (!isSignedIn) {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <GateBlocked
        title="Sign in required"
        message="Please sign in to access this page. You'll come back here afterwards."
        actionTo={`/auth/login?returnUrl=${returnUrl}`}
        actionLabel="Go to sign in"
      />
    );
  }

  return <>{children}</>;
}
