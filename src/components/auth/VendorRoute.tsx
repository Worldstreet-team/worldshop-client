import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface VendorRouteProps {
  children: React.ReactNode;
}

export default function VendorRoute({ children }: VendorRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  // Show loading state while Clerk is initializing or profile is syncing
  if (!isLoaded || (isSignedIn && isLoading)) {
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

  // Signed in but not a vendor — redirect to become a vendor
  if (!user?.isVendor) {
    return <Navigate to="/account" replace />;
  }

  // Vendor is banned
  if (user.vendorStatus === 'BANNED') {
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
          Your vendor account has been banned. Please contact support.
        </p>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>
          Return to Store
        </Link>
      </div>
    );
  }

  // Vendor is suspended — show read-only banner
  if (user.vendorStatus === 'SUSPENDED') {
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
          Your vendor account is suspended. You have read-only access. Please contact support for more information.
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
