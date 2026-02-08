import { useAuthStore } from '@/store/authStore';

/**
 * Custom hook for easy access to authentication functionality
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, logout } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>;
 *   }
 *   
 *   return <div>Welcome, {user.firstName}!</div>;
 * }
 * ```
 */
export function useAuth() {
    const {
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        logout,
        logoutAll,
        redirectToLogin,
        redirectToRegister,
        clearError,
    } = useAuthStore();

    return {
        // State
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,

        // Derived state
        isAdmin: user?.role === 'ADMIN',
        isVerified: user?.isVerified ?? false,

        // Actions
        logout,
        logoutAll,
        login: redirectToLogin,
        register: redirectToRegister,
        clearError,
    };
}

/**
 * Hook to check if user has a specific role
 * 
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const hasAccess = useHasRole('ADMIN');
 *   
 *   if (!hasAccess) {
 *     return <div>Access Denied</div>;
 *   }
 *   
 *   return <div>Admin Panel</div>;
 * }
 * ```
 */
export function useHasRole(role: string) {
    const { user, isAuthenticated } = useAuthStore();
    return isAuthenticated && user?.role === role;
}

/**
 * Hook to require authentication
 * If not authenticated, redirects to login
 * 
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { user, isLoading } = useRequireAuth();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return <div>Profile: {user.firstName}</div>;
 * }
 * ```
 */
export function useRequireAuth() {
    const { user, isAuthenticated, isInitialized, isLoading, redirectToLogin } = useAuthStore();

    // Redirect to login if not authenticated after initialization
    if (isInitialized && !isAuthenticated) {
        const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        redirectToLogin(returnUrl);
    }

    return {
        user,
        isLoading: !isInitialized || isLoading,
        isAuthenticated,
    };
}
