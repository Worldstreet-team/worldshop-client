import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertTriangle, SearchX } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { mallService, type MallStatus } from '@/services/mallService';
import { toApiError } from '@/services/api';
import { GateLoading, GateBlocked } from './RouteGate';

interface MallOwnerRouteProps {
  children: React.ReactNode;
}

/**
 * Gate for /mall/* — the mall owner console. Mirrors VendorRoute: owning a
 * mall is what makes someone a mall operator, so the mall is fetched rather
 * than read from the session. 404 → registration; BANNED/SUSPENDED render
 * their own states.
 */
export default function MallOwnerRoute({ children }: MallOwnerRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading } = useAuthStore();
  const location = useLocation();

  const [mall, setMall] = useState<{ checked: boolean; status: MallStatus | null; errored: boolean }>({
    checked: false,
    status: null,
    errored: false,
  });
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    mallService
      .getMyMall()
      .then((res) => {
        if (!cancelled) setMall({ checked: true, status: res.data.status, errored: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 404 = no mall yet — the common case. Anything else (network blip,
        // 5xx) must not silently redirect a real owner to registration.
        const is404 = toApiError(err, '').statusCode === 404;
        setMall({ checked: true, status: null, errored: !is404 });
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, retryTick]);

  const mallChecked = !isSignedIn || mall.checked;

  if (!isLoaded || (isSignedIn && isLoading) || (isSignedIn && !mallChecked)) {
    return <GateLoading />;
  }

  if (!isSignedIn) {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <GateBlocked
        title="Mall access required"
        message="Please sign in to access your mall dashboard."
        actionTo={`/auth/login?returnUrl=${returnUrl}`}
        actionLabel="Go to sign in"
      />
    );
  }

  if (mall.errored) {
    return (
      <div className="ws" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: 'var(--ws-space-6)' }}>
        <div className="ws-empty">
          <div className="ws-empty__icon"><SearchX size={26} aria-hidden /></div>
          <h2 className="ws-title">Could not confirm your mall</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '40ch' }}>
            Check your connection and try again — this isn't the same as not having a mall.
          </p>
          <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => setRetryTick((t) => t + 1)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!mall.status) {
    return <Navigate to="/mall/register" replace />;
  }

  if (mall.status === 'BANNED') {
    return (
      <GateBlocked
        tone="danger"
        title="Mall banned"
        message="Your mall has been banned. Please contact support if you think this is a mistake."
        actionTo="/"
        actionLabel="Back to the marketplace"
      />
    );
  }

  if (mall.status === 'SUSPENDED') {
    return (
      <div className="ws">
        <div
          className="ws-alert ws-alert--warning"
          style={{ borderRadius: 0, border: 0, borderBottom: '1px solid var(--ws-status-warning)', justifyContent: 'center' }}
          role="status"
        >
          <AlertTriangle size={16} aria-hidden />
          <span>
            Your mall is suspended and hidden from buyers. You have read-only access. Please contact support.
          </span>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
