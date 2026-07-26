import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { storeService, type StoreStatus } from '@/services/storeService';

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

  // Show loading state while Clerk is initializing or profile is syncing
  if (!isLoaded || (isSignedIn && isLoading) || (isSignedIn && !storeChecked)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    const returnUrl = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: '#333' }}>
          Vendor Access Required
        </h2>
        <p style={{ marginBottom: '2rem', color: '#666', maxWidth: '400px' }}>
          Please log in to access the vendor dashboard.
        </p>
        <Link
          to={`/auth/login?returnUrl=${returnUrl}`}
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Signed in but has no store — send them to create one.
  if (!storeStatus) {
    return <Navigate to="/vendor/register" replace />;
  }

  // Store is banned
  if (storeStatus === 'BANNED') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', color: '#dc3545' }}>
          Account Banned
        </h2>
        <p style={{ marginBottom: '2rem', color: '#666', maxWidth: '400px' }}>
          Your store has been banned. Please contact support.
        </p>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          Return to Store
        </Link>
      </div>
    );
  }

  // Store is suspended — show read-only banner
  if (storeStatus === 'SUSPENDED') {
    return (
      <div>
        <div style={{
          backgroundColor: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          padding: '0.75rem 1.5rem',
          textAlign: 'center',
          color: '#856404',
          fontSize: '0.95rem',
          fontWeight: 500,
        }}>
          Your store is suspended and hidden from buyers. You have read-only access. Please contact support.
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
