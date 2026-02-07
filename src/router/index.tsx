import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import AdminLayout from '@/layouts/AdminLayout';
import AuthLayout from '@/layouts/AuthLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';

// Lazy load pages for code splitting
// Customer Pages
const HomePage = lazy(() => import('@/pages/Home'));
const ProductListingPage = lazy(() => import('@/pages/ProductListing'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetail'));
const CategoryPage = lazy(() => import('@/pages/Category'));
const SearchResultsPage = lazy(() => import('@/pages/SearchResults'));
const CartPage = lazy(() => import('@/pages/Cart'));
const CheckoutPage = lazy(() => import('@/pages/Checkout'));
const CheckoutSuccessPage = lazy(() => import('@/pages/CheckoutSuccess'));
const CheckoutFailurePage = lazy(() => import('@/pages/CheckoutFailure'));

// Account Pages
const LoginPage = lazy(() => import('@/pages/auth/Login'));
const RegisterPage = lazy(() => import('@/pages/auth/Register'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword'));

// Protected Account Pages
const AccountPage = lazy(() => import('@/pages/account/Account'));
const OrderHistoryPage = lazy(() => import('@/pages/account/OrderHistory'));
const OrderDetailPage = lazy(() => import('@/pages/account/OrderDetail'));
const AddressesPage = lazy(() => import('@/pages/account/Addresses'));
const WishlistPage = lazy(() => import('@/pages/account/Wishlist'));
const ProfilePage = lazy(() => import('@/pages/account/Profile'));

// Admin Pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const AdminProductEdit = lazy(() => import('@/pages/admin/ProductEdit'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminOrderDetail = lazy(() => import('@/pages/admin/OrderDetail'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminInventory = lazy(() => import('@/pages/admin/Inventory'));

// Error Pages
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// Suspense wrapper for lazy loaded pages
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    {children}
  </Suspense>
);

const router = createBrowserRouter([
  // Public routes with main layout
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><HomePage /></SuspenseWrapper>,
      },
      {
        path: 'products',
        element: <SuspenseWrapper><ProductListingPage /></SuspenseWrapper>,
      },
      {
        path: 'products/:slug',
        element: <SuspenseWrapper><ProductDetailPage /></SuspenseWrapper>,
      },
      {
        path: 'category/:slug',
        element: <SuspenseWrapper><CategoryPage /></SuspenseWrapper>,
      },
      {
        path: 'search',
        element: <SuspenseWrapper><SearchResultsPage /></SuspenseWrapper>,
      },
      {
        path: 'cart',
        element: <SuspenseWrapper><CartPage /></SuspenseWrapper>,
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><CheckoutPage /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'checkout/success',
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><CheckoutSuccessPage /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'checkout/failed',
        element: (
          <ProtectedRoute>
            <SuspenseWrapper><CheckoutFailurePage /></SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
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
            path: 'orders',
            element: <SuspenseWrapper><OrderHistoryPage /></SuspenseWrapper>,
          },
          {
            path: 'orders/:id',
            element: <SuspenseWrapper><OrderDetailPage /></SuspenseWrapper>,
          },
          {
            path: 'addresses',
            element: <SuspenseWrapper><AddressesPage /></SuspenseWrapper>,
          },
          {
            path: 'wishlist',
            element: <SuspenseWrapper><WishlistPage /></SuspenseWrapper>,
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
    children: [
      {
        index: true,
        element: <SuspenseWrapper><AdminDashboard /></SuspenseWrapper>,
      },
      {
        path: 'products',
        element: <SuspenseWrapper><AdminProducts /></SuspenseWrapper>,
      },
      {
        path: 'products/new',
        element: <SuspenseWrapper><AdminProductEdit /></SuspenseWrapper>,
      },
      {
        path: 'products/:id',
        element: <SuspenseWrapper><AdminProductEdit /></SuspenseWrapper>,
      },
      {
        path: 'orders',
        element: <SuspenseWrapper><AdminOrders /></SuspenseWrapper>,
      },
      {
        path: 'orders/:id',
        element: <SuspenseWrapper><AdminOrderDetail /></SuspenseWrapper>,
      },
      {
        path: 'categories',
        element: <SuspenseWrapper><AdminCategories /></SuspenseWrapper>,
      },
      {
        path: 'inventory',
        element: <SuspenseWrapper><AdminInventory /></SuspenseWrapper>,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
