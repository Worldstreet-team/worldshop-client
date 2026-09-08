import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { GateLoading } from './RouteGate';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Gates the console on an admin session cookie, not on Clerk.
 *
 * The role is no longer read from the persisted auth store: that value lives in
 * localStorage and can be edited, and it only ever worked because the server
 * enforced the real check anyway. Here the question — "does this browser hold a
 * valid admin session?" — is answered by the server on every page load.
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { status, checkSession } = useAdminAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (status === 'unknown') void checkSession();
  }, [status, checkSession]);

  if (status === 'unknown' || status === 'checking') return <GateLoading />;

  // Redirect rather than explain, so the console's existence is not advertised.
  if (status !== 'authed') {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/admin/login?returnUrl=${returnUrl}`} replace />;
  }

  return <>{children}</>;
}
