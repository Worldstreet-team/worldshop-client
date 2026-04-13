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

          // Extract profile from response (handle both wrapper structures)
          const profile = response.data?.data || response.data;

          const user: User = {
            id: profile.id || profile.userId || '',
            email: profile.email || '',
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: profile.phone || undefined,
            avatar: profile.avatar || undefined,
            role: profile.role || 'CUSTOMER',
            isVerified: true, // Clerk handles verification
            isVendor: profile.isVendor || false,
            vendorStatus: profile.vendorStatus || null,
            storeName: profile.storeName || null,
            storeSlug: profile.storeSlug || null,
            storeDescription: profile.storeDescription || null,
            vendorSince: profile.vendorSince || null,
            createdAt: profile.createdAt || new Date().toISOString(),
            updatedAt: profile.updatedAt || new Date().toISOString(),
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
          } catch (mergeErr) {
            console.error('Failed to merge guest cart:', mergeErr);
            // Still fetch user's existing cart even if merge failed
            try {
              await useCartStore.getState().fetchCart();
            } catch { /* cart will be empty */ }
            set({ error: 'Some items from your guest cart could not be transferred. Please re-add them.' });
          }
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
