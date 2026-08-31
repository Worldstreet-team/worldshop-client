import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';
import VendorLayout from '@/layouts/VendorLayout';
import MallLayout from '@/layouts/MallLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { RouteError } from '@/components/common';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import VendorRoute from '@/components/auth/VendorRoute';
import MallOwnerRoute from '@/components/auth/MallOwnerRoute';
import { SubstoreListingApiProvider } from '@/contexts/ListingApiContext';

// Lazy load pages for code splitting
// Customer Pages

// Account Pages
const LoginPage = lazy(() => import('@/pages/auth/Login'));
const RegisterPage = lazy(() => import('@/pages/auth/Register'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword'));

// Protected Account Pages
const AccountPage = lazy(() => import('@/pages/account/Account'));
const ProfilePage = lazy(() => import('@/pages/account/Profile'));
const AccountMessagesPage = lazy(() => import('@/pages/account/Messages'));
const HomePage = lazy(() => import('@/pages/marketplace/Home'));
const BrowsePage = lazy(() => import('@/pages/marketplace/Browse'));
const ListingDetailPage = lazy(() => import('@/pages/marketplace/ListingDetail'));
const MarketplaceStorePage = lazy(() => import('@/pages/marketplace/StorePage'));
const MallsDirectoryPage = lazy(() => import('@/pages/marketplace/MallsDirectory'));
const MarketplaceMallPage = lazy(() => import('@/pages/marketplace/MallPage'));
const SavedPage = lazy(() => import('@/pages/marketplace/Saved'));
const LegalPage = lazy(() => import('@/pages/Legal'));

// Admin Pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));

// Vendor Pages
const VendorDashboard = lazy(() => import('@/pages/vendor/Dashboard'));
const VendorRegistration = lazy(() => import('@/pages/vendor/Registration'));
const VendorProducts = lazy(() => import('@/pages/vendor/Products'));
const VendorProductEdit = lazy(() => import('@/pages/vendor/ProductEdit'));
const VendorSettings = lazy(() => import('@/pages/vendor/Settings'));
const VendorReviews = lazy(() => import('@/pages/vendor/Reviews'));
const VendorMessages = lazy(() => import('@/pages/vendor/Messages'));

// Mall Pages
const MallDashboard = lazy(() => import('@/pages/mall/Dashboard'));
const MallRegistration = lazy(() => import('@/pages/mall/Registration'));
const MallSubstores = lazy(() => import('@/pages/mall/Substores'));
const MallFeatured = lazy(() => import('@/pages/mall/Featured'));

// Error Pages
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// Suspense wrapper for lazy loaded pages
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    {children}
  </Suspense>
);

/** /store/:slug → /stores/:slug — the slug survived the pivot backfill. */
function LegacyStoreRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/stores/${slug}`} replace />;
}

/**
 * Substore listing pages reuse the vendor product pages, re-pointed at the
 * substore's endpoints via context. The provider needs the :substoreId param,
 * which is only available inside the route element.
 */
function SubstorePage({ children }: { children: React.ReactNode }) {
  const { substoreId } = useParams<{ substoreId: string }>();
  if (!substoreId) return <Navigate to="/mall/substores" replace />;
  return (
    <SubstoreListingApiProvider substoreId={substoreId}>
      {children}
    </SubstoreListingApiProvider>
  );
}

const router = createBrowserRouter([
  // Public routes with main layout
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      // The root is a segmented landing (hero, rails, promo); the full
      // marketplace grid lives at /listings.
      {
        index: true,
        element: <SuspenseWrapper><HomePage /></SuspenseWrapper>,
      },
      {
        path: 'listings',
        element: <SuspenseWrapper><BrowsePage /></SuspenseWrapper>,
      },
      {
        path: 'listings/:idOrSlug',
        element: <SuspenseWrapper><ListingDetailPage /></SuspenseWrapper>,
      },
      {
        path: 'stores/:slug',
        element: <SuspenseWrapper><MarketplaceStorePage /></SuspenseWrapper>,
      },
      {
        path: 'malls',
        element: <SuspenseWrapper><MallsDirectoryPage /></SuspenseWrapper>,
      },
      {
        path: 'malls/:slug',
        element: <SuspenseWrapper><MarketplaceMallPage /></SuspenseWrapper>,
      },
      // Saved hearts are device-local, so this needs no sign-in.
      {
        path: 'saved',
        element: <SuspenseWrapper><SavedPage /></SuspenseWrapper>,
      },
      { path: 'terms', element: <SuspenseWrapper><LegalPage doc="terms" /></SuspenseWrapper> },
      { path: 'privacy', element: <SuspenseWrapper><LegalPage doc="privacy" /></SuspenseWrapper> },
      { path: 'cookies', element: <SuspenseWrapper><LegalPage doc="cookies" /></SuspenseWrapper> },
      // Legacy ecommerce URLs. Shopping flows (cart, checkout, orders) are
      // gone; browse-shaped ones land on the marketplace, and old store links
      // keep their slug since the backfill preserved it.
      { path: 'store/:slug', element: <LegacyStoreRedirect /> },
      { path: 'products', element: <Navigate to="/listings" replace /> },
      { path: 'products/:slug', element: <Navigate to="/listings" replace /> },
      { path: 'category/:slug', element: <Navigate to="/listings" replace /> },
      { path: 'categories', element: <Navigate to="/listings" replace /> },
      { path: 'search', element: <Navigate to="/listings" replace /> },
      { path: 'cart', element: <Navigate to="/listings" replace /> },
      { path: 'checkout/*', element: <Navigate to="/listings" replace /> },
      // Account routes (protected)
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <SuspenseWrapper><AccountPage /></SuspenseWrapper>,
          },
          {
            path: 'messages',
            element: <SuspenseWrapper><AccountMessagesPage /></SuspenseWrapper>,
          },
          {
            path: 'profile',
            element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper>,
          },
        ],
      },
      // 404 for main layout
      {
        path: '*',
        element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper>,
      },
    ],
  },
  // Auth routes (no main layout)
  {
    path: '/auth',
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: 'login',
        element: <SuspenseWrapper><LoginPage /></SuspenseWrapper>,
      },
      {
        path: 'register',
        element: <SuspenseWrapper><RegisterPage /></SuspenseWrapper>,
      },
      {
        path: 'forgot-password',
        element: <SuspenseWrapper><ForgotPasswordPage /></SuspenseWrapper>,
      },
      {
        path: 'reset-password',
        element: <SuspenseWrapper><ResetPasswordPage /></SuspenseWrapper>,
      },
      // Without this, /auth/anything-else rendered AuthLayout around an
      // empty Outlet — a blank page.
      { path: '*', element: <Navigate to="/auth/login" replace /> },
    ],
  },
  // Vendor registration (protected, but NOT vendor-gated)
  {
    path: '/vendor/register',
    element: (
      <MainLayout />
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><VendorRegistration /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Mall registration (protected, but NOT mall-gated)
  {
    path: '/mall/register',
    element: (
      <MainLayout />
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><MallRegistration /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Mall owner routes (mall layout, mall-gated)
  {
    path: '/mall',
    element: (
      <MallOwnerRoute>
        <MallLayout />
      </MallOwnerRoute>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><MallDashboard /></SuspenseWrapper>,
      },
      {
        path: 'substores',
        element: <SuspenseWrapper><MallSubstores /></SuspenseWrapper>,
      },
      {
        path: 'featured',
        element: <SuspenseWrapper><MallFeatured /></SuspenseWrapper>,
      },
      // The vendor product pages, re-pointed at a substore's catalogue.
      {
        path: 'substores/:substoreId/products',
        element: <SubstorePage><SuspenseWrapper><VendorProducts /></SuspenseWrapper></SubstorePage>,
      },
      {
        path: 'substores/:substoreId/products/new',
        element: <SubstorePage><SuspenseWrapper><VendorProductEdit /></SuspenseWrapper></SubstorePage>,
      },
      {
        path: 'substores/:substoreId/products/:id',
        element: <SubstorePage><SuspenseWrapper><VendorProductEdit /></SuspenseWrapper></SubstorePage>,
      },
      {
        path: '*',
        element: <Navigate to="/mall" replace />,
      },
    ],
  },
  // Vendor routes (vendor layout, vendor-gated)
  {
    path: '/vendor',
    element: (
      <VendorRoute>
        <VendorLayout />
      </VendorRoute>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><VendorDashboard /></SuspenseWrapper>,
      },
      {
        path: 'products',
        element: <SuspenseWrapper><VendorProducts /></SuspenseWrapper>,
      },
      {
        path: 'products/new',
        element: <SuspenseWrapper><VendorProductEdit /></SuspenseWrapper>,
      },
      {
        path: 'products/:id',
        element: <SuspenseWrapper><VendorProductEdit /></SuspenseWrapper>,
      },
      {
        path: 'settings',
        element: <SuspenseWrapper><VendorSettings /></SuspenseWrapper>,
      },
      {
        path: 'reviews',
        element: <SuspenseWrapper><VendorReviews /></SuspenseWrapper>,
      },
      {
        path: 'messages',
        element: <SuspenseWrapper><VendorMessages /></SuspenseWrapper>,
      },
      // Stale bookmarks to removed pages (orders, withdrawals) land on the
      // dashboard rather than an unmatched-route error.
      {
        path: '*',
        element: <Navigate to="/vendor" replace />,
      },
    ],
  },
  // Admin routes (admin layout, protected)
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><AdminDashboard /></SuspenseWrapper>,
      },
      {
        path: 'categories',
        element: <SuspenseWrapper><AdminCategories /></SuspenseWrapper>,
      },
      {
        path: 'users',
        element: <SuspenseWrapper><AdminUsers /></SuspenseWrapper>,
      },
      // Stale bookmarks to removed ecommerce pages (orders, inventory,
      // vendors, withdrawals, commission) land on the dashboard.
      {
        path: '*',
        element: <Navigate to="/admin" replace />,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
