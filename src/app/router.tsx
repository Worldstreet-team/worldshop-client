import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from 'react-router-dom';
import WsRootLayout from '@ws/app/RootLayout';
import WsShopLayout, { LegacyPage } from '@ws/app/ShopLayout';
import { wsNotFoundRoute, wsShopRoutes } from '@ws/app/routes';
import { BrowseRedirect, CategoryRedirect, ListingRedirect, SellerRedirect } from '@ws/app/redirects';
import AdminLayout from '@/app/layouts/AdminLayout';
import AuthLayout from '@/app/layouts/AuthLayout';
import VendorLayout from '@/app/layouts/VendorLayout';
import MallLayout from '@/app/layouts/MallLayout';
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner';
import { RouteError } from '@/shared/components/common';
import ProtectedRoute from '@/features/auth/components/ProtectedRoute';
import AdminRoute from '@/features/auth/components/AdminRoute';
import VendorRoute from '@/features/auth/components/VendorRoute';
import MallOwnerRoute from '@/features/auth/components/MallOwnerRoute';
import { SubstoreListingApiProvider } from '@/features/stores/context/ListingApiContext';

// Lazy load pages for code splitting
// Customer Pages

// Account Pages
const LoginPage = lazy(() => import('@/features/auth/pages/Login'));
const RegisterPage = lazy(() => import('@/features/auth/pages/Register'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPassword'));
const SetupPasswordPage = lazy(() => import('@/features/auth/pages/SetupPassword'));

// Protected Account Pages
const AccountPage = lazy(() => import('@/features/account/pages/Account'));
const ProfilePage = lazy(() => import('@/features/account/pages/Profile'));
const AccountMessagesPage = lazy(() => import('@/features/chat/pages/AccountMessages'));
const StoresDirectoryPage = lazy(() => import('@/features/stores/pages/StoresDirectory'));
const MallsDirectoryPage = lazy(() => import('@/features/malls/pages/MallsDirectory'));
const MarketplaceMallPage = lazy(() => import('@/features/malls/pages/MallPage'));
const CategoriesPage = lazy(() => import('@/features/catalog/pages/Categories'));
const LegalPage = lazy(() => import('@/features/legal/pages/Legal'));

// Admin Pages
const AdminLoginPage = lazy(() => import('@/features/admin/pages/Login'));
const AdminDashboard = lazy(() => import('@/features/admin/pages/Dashboard'));
const AdminCategories = lazy(() => import('@/features/admin/pages/Categories'));
const AdminUsers = lazy(() => import('@/features/admin/pages/Users'));
const AdminPricing = lazy(() => import('@/features/admin/pages/Pricing'));
const AdminRevenue = lazy(() => import('@/features/admin/pages/Revenue'));

// Vendor Pages
const VendorDashboard = lazy(() => import('@/features/stores/pages/Dashboard'));
const VendorRegistration = lazy(() => import('@/features/stores/pages/Registration'));
const VendorProducts = lazy(() => import('@/features/stores/pages/Products'));
const VendorProductEdit = lazy(() => import('@/features/stores/pages/ProductEdit'));
const VendorSettings = lazy(() => import('@/features/stores/pages/Settings'));
const VendorReviews = lazy(() => import('@/features/reviews/pages/VendorReviews'));
const VendorMessages = lazy(() => import('@/features/chat/pages/VendorMessages'));

// Mall Pages
const MallDashboard = lazy(() => import('@/features/malls/pages/Dashboard'));
const MallRegistration = lazy(() => import('@/features/malls/pages/Registration'));
const MallSubstores = lazy(() => import('@/features/malls/pages/Substores'));
const MallFeatured = lazy(() => import('@/features/malls/pages/Featured'));
const MallSettings = lazy(() => import('@/features/malls/pages/Settings'));
const SubstoreEdit = lazy(() => import('@/features/malls/pages/SubstoreEdit'));


// Suspense wrapper for lazy loaded pages
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    {children}
  </Suspense>
);

/**
 * Pages not yet on the WorldStore UI keep their old layouts. Their styles only apply
 * under .ws-legacy (src/styles/main.scss), so each is wrapped in one.
 */
const Legacy = ({ children }: { children: React.ReactNode }) => <div className="ws-legacy">{children}</div>;

/**
 * Substore listing pages reuse the vendor product pages, re-pointed at the
 * substore's endpoints via context. The provider needs the :substoreId param,
 * which is only available inside the route element.
 */
function SubstorePage({ children }: { children: React.ReactNode }) {
  const { substoreId } = useParams<{ substoreId: string }>();
  if (!substoreId) return <Navigate to="/mall/stores" replace />;
  return (
    <SubstoreListingApiProvider substoreId={substoreId}>
      {children}
    </SubstoreListingApiProvider>
  );
}

const router = createBrowserRouter([
  // The WorldStore UI: header, footer and bottom nav around every buyer page.
  {
    path: '/',
    element: <WsRootLayout />,
    errorElement: <RouteError />,
    children: [
      // Pages ported to the WorldStore UI, under the category rail.
      { element: <WsShopLayout />, children: wsShopRoutes },
      // Pages still on the old styles, inside the new shell.
      {
        element: <LegacyPage />,
        children: [
          { path: 'categories', element: <SuspenseWrapper><CategoriesPage /></SuspenseWrapper> },
          { path: 'stores', element: <SuspenseWrapper><StoresDirectoryPage /></SuspenseWrapper> },
          { path: 'malls', element: <SuspenseWrapper><MallsDirectoryPage /></SuspenseWrapper> },
          { path: 'malls/:slug', element: <SuspenseWrapper><MarketplaceMallPage /></SuspenseWrapper> },
          { path: 'terms', element: <SuspenseWrapper><LegalPage doc="terms" /></SuspenseWrapper> },
          { path: 'privacy', element: <SuspenseWrapper><LegalPage doc="privacy" /></SuspenseWrapper> },
          { path: 'safety-tips', element: <SuspenseWrapper><LegalPage doc="safety" /></SuspenseWrapper> },
          { path: 'cookies', element: <SuspenseWrapper><LegalPage doc="cookies" /></SuspenseWrapper> },
          {
            path: 'account',
            element: (
              <ProtectedRoute>
                <Outlet />
              </ProtectedRoute>
            ),
            children: [
              { index: true, element: <SuspenseWrapper><AccountPage /></SuspenseWrapper> },
              { path: 'messages', element: <SuspenseWrapper><AccountMessagesPage /></SuspenseWrapper> },
              { path: 'profile', element: <SuspenseWrapper><ProfilePage /></SuspenseWrapper> },
            ],
          },
          // Opening a store or a mall: signed in, but not yet a seller.
          { path: 'vendor/register', element: <ProtectedRoute><SuspenseWrapper><VendorRegistration /></SuspenseWrapper></ProtectedRoute> },
          { path: 'mall/register', element: <ProtectedRoute><SuspenseWrapper><MallRegistration /></SuspenseWrapper></ProtectedRoute> },
        ],
      },
      // URLs from before the WorldStore UI, sent to their new homes (ws/app/redirects.tsx).
      { path: 'listings', element: <BrowseRedirect /> },
      { path: 'listings/:idOrSlug', element: <ListingRedirect /> },
      { path: 'stores/:slug', element: <SellerRedirect /> },
      { path: 'store/:slug', element: <SellerRedirect /> },
      { path: 'categories/:slug', element: <CategoryRedirect /> },
      // Selling starts in the listing editor until the sell wizard is ported.
      { path: 'sell/new', element: <Navigate to="/vendor/products/new" replace /> },
      // Ecommerce URLs from before the marketplace pivot.
      { path: 'products', element: <Navigate to="/search" replace /> },
      { path: 'products/:slug', element: <Navigate to="/search" replace /> },
      { path: 'category/:slug', element: <CategoryRedirect /> },
      { path: 'cart', element: <Navigate to="/search" replace /> },
      { path: 'checkout/*', element: <Navigate to="/search" replace /> },
      wsNotFoundRoute,
    ],
  },
  // Auth routes (no main layout)
  {
    path: '/auth',
    element: <Legacy><AuthLayout /></Legacy>,
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
      // Where an emailed admin setup link lands.
      {
        path: 'setup-password',
        element: <SuspenseWrapper><SetupPasswordPage /></SuspenseWrapper>,
      },
      // Without this, /auth/anything-else rendered AuthLayout around an
      // empty Outlet — a blank page.
      { path: '*', element: <Navigate to="/auth/login" replace /> },
    ],
  },
  // Mall owner routes (mall layout, mall-gated)
  {
    path: '/mall',
    element: (
      <Legacy>
        <MallOwnerRoute>
          <MallLayout />
        </MallOwnerRoute>
      </Legacy>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><MallDashboard /></SuspenseWrapper>,
      },
      {
        path: 'stores',
        element: <SuspenseWrapper><MallSubstores /></SuspenseWrapper>,
      },
      {
        path: 'featured',
        element: <SuspenseWrapper><MallFeatured /></SuspenseWrapper>,
      },
      {
        path: 'settings',
        element: <SuspenseWrapper><MallSettings /></SuspenseWrapper>,
      },
      {
        path: 'stores/:substoreId/edit',
        element: <SuspenseWrapper><SubstoreEdit /></SuspenseWrapper>,
      },
      // The vendor product pages, re-pointed at a substore's catalogue.
      {
        path: 'stores/:substoreId/products',
        element: <SubstorePage><SuspenseWrapper><VendorProducts /></SuspenseWrapper></SubstorePage>,
      },
      {
        path: 'stores/:substoreId/products/new',
        element: <SubstorePage><SuspenseWrapper><VendorProductEdit /></SuspenseWrapper></SubstorePage>,
      },
      {
        path: 'stores/:substoreId/products/:id',
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
      <Legacy>
        <VendorRoute>
          <VendorLayout />
        </VendorRoute>
      </Legacy>
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
  // Admin sign-in. Declared outside the gated /admin branch, or AdminRoute
  // would bounce an unauthenticated admin away from the page they need.
  {
    path: '/admin/login',
    element: <Legacy><AuthLayout /></Legacy>,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><AdminLoginPage /></SuspenseWrapper>,
      },
    ],
  },
  // Admin routes (admin layout, protected)
  {
    path: '/admin',
    element: (
      <Legacy>
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      </Legacy>
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
      {
        path: 'pricing',
        element: <SuspenseWrapper><AdminPricing /></SuspenseWrapper>,
      },
      {
        path: 'revenue',
        element: <SuspenseWrapper><AdminRevenue /></SuspenseWrapper>,
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
