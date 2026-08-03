import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { storeService, type StoreStatus } from '@/services/storeService';
import { GateLoading, GateBlocked } from './RouteGate';

interface VendorRouteProps {
  children: React.ReactNode;
}

export default function VendorRoute({ children }: VendorRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading } = useAuthStore();
  const location = useLocation();

  /**
   * Owning a store is what makes someone a seller now — not the legacy
   * `isVendor` flag on the identity profile, which is no longer set for
   * anyone. The store is fetched rather than read from the session because
   * it can be created mid-session.
   */
  const [store, setStore] = useState<{ checked: boolean; status: StoreStatus | null }>({
    checked: false,
    status: null,
  });

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    storeService
      .getMyStore()
      .then((res) => {
        if (!cancelled) setStore({ checked: true, status: res.data.status });
      })
      .catch(() => {
        // 404 = no store yet; any other failure also means we cannot confirm one.
        if (!cancelled) setStore({ checked: true, status: null });
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  // Signed-out users never need the lookup, so they are "checked" by definition.
  const storeChecked = !isSignedIn || store.checked;
  const storeStatus = store.status;

  // Clerk initializing, the profile syncing, or the store lookup in flight.
  if (!isLoaded || (isSignedIn && isLoading) || (isSignedIn && !storeChecked)) {
    return <GateLoading />;
  }

  if (!isSignedIn) {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <GateBlocked
        title="Seller access required"
        message="Please sign in to access your store dashboard."
        actionTo={`/auth/login?returnUrl=${returnUrl}`}
        actionLabel="Go to sign in"
      />
    );
  }

  // Signed in but has no store — send them to create one.
  if (!storeStatus) {
    return <Navigate to="/vendor/register" replace />;
  }

  if (storeStatus === 'BANNED') {
    return (
      <GateBlocked
        tone="danger"
        title="Store banned"
        message="Your store has been banned. Please contact support if you think this is a mistake."
        actionTo="/"
        actionLabel="Back to the marketplace"
      />
    );
  }

  // Suspended sellers keep read-only access, so the dashboard still renders —
  // the banner is what tells them why nothing saves.
  if (storeStatus === 'SUSPENDED') {
    return (
      <div className="ws">
        <div
          className="ws-alert ws-alert--warning"
          style={{ borderRadius: 0, border: 0, borderBottom: '1px solid var(--ws-status-warning)', justifyContent: 'center' }}
          role="status"
        >
          <AlertTriangle size={16} aria-hidden />
          <span>
            Your store is suspended and hidden from buyers. You have read-only access. Please contact support.
          </span>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
