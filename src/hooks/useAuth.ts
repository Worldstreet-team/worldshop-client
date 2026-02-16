import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook for easy access to authentication functionality.
 * Combines Clerk auth state with our store's user profile data.
 */
export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const {
    user,
    isLoading,
    error,
    logout: storeLogout,
    redirectToLogin,
    redirectToRegister,
    clearError,
  } = useAuthStore();

  const logout = async () => {
    await signOut();
    storeLogout();
  };

  return {
    // State
    user,
    isAuthenticated: !!isSignedIn,
    isLoading: !isLoaded || isLoading,
    isInitialized: isLoaded,
    error,

    // Derived state
    isAdmin: user?.role === 'ADMIN',
    isVerified: true, // Clerk handles verification

    // Actions
    logout,
    login: redirectToLogin,
    register: redirectToRegister,
    clearError,
  };
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string) {
  const { isSignedIn } = useClerkAuth();
  const { user } = useAuthStore();
  return !!isSignedIn && user?.role === role;
}

/**
 * Hook to check authentication status without redirecting.
 * Components should handle unauthenticated state themselves.
 */
export function useRequireAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user, isLoading } = useAuthStore();

  return {
    user,
    isLoading: !isLoaded || isLoading,
    isAuthenticated: !!isSignedIn,
  };
}
