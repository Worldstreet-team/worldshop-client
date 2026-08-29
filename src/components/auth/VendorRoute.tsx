import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, SearchX } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { storeService, type StoreStatus } from '@/services/storeService';
import { toApiError } from '@/services/api';
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
  const [store, setStore] = useState<{ checked: boolean; status: StoreStatus | null; errored: boolean }>({
    checked: false,
    status: null,
    errored: false,
  });
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    storeService
      .getMyStore()
      .then((res) => {
        if (!cancelled) setStore({ checked: true, status: res.data.status, errored: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 404 = no store yet — the common case. Any other failure (a network
        // blip, a 5xx) is not the same thing, and treating it that way would
        // silently redirect a real seller away from their own dashboard.
        const is404 = toApiError(err, '').statusCode === 404;
        setStore({ checked: true, status: null, errored: !is404 });
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, retryTick]);

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

  // The lookup itself failed (not a 404) — this is not "no store", so don't
  // send them to registration. Offer a retry instead of stranding them.
  if (store.errored) {
    return (
      <div className="ws" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: 'var(--ws-space-6)' }}>
        <div className="ws-empty">
          <div className="ws-empty__icon"><SearchX size={26} aria-hidden /></div>
          <h2 className="ws-title">Could not confirm your store</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '40ch' }}>
            Check your connection and try again — this isn't the same as not having a store.
          </p>
          <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => setRetryTick((t) => t + 1)}>
            Try again
          </button>
        </div>
      </div>
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
