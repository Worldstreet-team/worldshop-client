import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { GateLoading, GateBlocked } from './RouteGate';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  // The role lives on the synced profile rather than the Clerk session, so an
  // authenticated-but-unsynced user is still resolving here.
  if (!isLoaded || (isSignedIn && isLoading)) return <GateLoading />;

  if (!isSignedIn) {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <GateBlocked
        title="Admin access required"
        message="Please sign in with an admin account to access this page."
        actionTo={`/auth/login?returnUrl=${returnUrl}`}
        actionLabel="Go to sign in"
      />
    );
  }

  // Signed in but not an admin — redirect rather than explain, so the console's
  // existence is not advertised.
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
