import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/user.types';
import { useCartStore } from './cartStore';

const LOGIN_URL = 'https://www.worldstreetgold.com/login';
const REGISTER_URL = 'https://www.worldstreetgold.com/register';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  /** Called when Clerk session becomes active — fetches profile from our API */
  syncClerkUser: () => Promise<void>;
  /** Called when Clerk session ends */
  clearUser: () => void;
  /** Update local user state (e.g. after profile edit) */
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  /** Redirect to WorldStreetGold login page */
  redirectToLogin: (returnUrl?: string) => void;
  /** Redirect to WorldStreetGold register page */
  redirectToRegister: (returnUrl?: string) => void;
  /** Sign out via Clerk (should be called from component with useClerk) */
  logout: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Sync user data from our API after Clerk authenticates.
       * The API call goes through the Clerk-authenticated axios interceptor,
       * which attaches the Clerk session token.
       * The server's /profile endpoint auto-creates a UserProfile if needed.
       */
      syncClerkUser: async () => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });

        try {
          // Dynamic import to avoid circular dependency with api.ts
          const { default: apiClient } = await import('@/services/api');
          const response = await apiClient.get('/profile');
          const profile = (response.data as { data?: { profile?: User }; profile?: User })?.data?.profile
            || (response.data as { profile?: User })?.profile
            || response.data;

          const user: User = {
            id: (profile as User).id || '',
            email: (profile as User).email || '',
            firstName: (profile as User).firstName || '',
            lastName: (profile as User).lastName || '',
            phone: (profile as User).phone || undefined,
            avatar: (profile as User).avatar || undefined,
            role: (profile as User).role || 'CUSTOMER',
            isVerified: true, // Clerk handles verification
            createdAt: (profile as User).createdAt || new Date().toISOString(),
            updatedAt: (profile as User).updatedAt || new Date().toISOString(),
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Merge guest cart into user cart
          try {
            await useCartStore.getState().mergeGuestCart();
            await useCartStore.getState().fetchCart();
          } catch { /* silent */ }
        } catch (error) {
          console.error('Failed to sync user profile:', error);
          set({
            isLoading: false,
            error: 'Failed to load profile. Please try again.',
          });
        }
      },

      clearUser: () => {
        set({
          ...initialState,
        });
        useCartStore.getState().clearLocalCart();
        localStorage.setItem('sessionId', crypto.randomUUID());
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      clearError: () => set({ error: null }),

      redirectToLogin: (returnUrl?: string) => {
        const url = returnUrl
          ? `${LOGIN_URL}?redirect=${encodeURIComponent(returnUrl)}`
          : LOGIN_URL;
        window.location.href = url;
      },

      redirectToRegister: (returnUrl?: string) => {
        const url = returnUrl
          ? `${REGISTER_URL}?redirect=${encodeURIComponent(returnUrl)}`
          : REGISTER_URL;
        window.location.href = url;
      },

      logout: () => {
        // The actual Clerk signOut is called from the component.
        // This just cleans up local state.
        set({ ...initialState });
        useCartStore.getState().clearLocalCart();
        localStorage.setItem('sessionId', crypto.randomUUID());
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
