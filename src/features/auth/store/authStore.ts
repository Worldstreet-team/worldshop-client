import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/features/auth/types';

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || 'https://www.worldstreetgold.com/login';
const REGISTER_URL = import.meta.env.VITE_REGISTER_URL || 'https://www.worldstreetgold.com/register';
const RETURN_PARAM = import.meta.env.VITE_AUTH_RETURN_PARAM || 'redirect';
const PROFILE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function withReturn(base: string, returnUrl?: string) {
  if (!returnUrl) return base;
  const url = new URL(base);
  url.searchParams.set(RETURN_PARAM, returnUrl);
  return url.toString();
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

interface AuthActions {
  /** Called when Clerk session becomes active — fetches profile from our API */
  syncClerkUser: (force?: boolean) => Promise<void>;
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
  lastFetched: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      syncClerkUser: async (force = false) => {
        if (get().isLoading) return;

        const state = get();
        if (!force && state.user && state.lastFetched && Date.now() - state.lastFetched < PROFILE_TTL_MS) {
          if (!state.isAuthenticated) set({ isAuthenticated: true });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const { default: apiClient } = await import('@/shared/lib/api');
          const response = await apiClient.get('/profile');
          const profile = response.data?.data || response.data;

          const user: User = {
            id: profile.id || profile.userId || '',
            email: profile.email || '',
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            phone: profile.phone || undefined,
            avatar: profile.avatar || undefined,
            role: profile.role || 'CUSTOMER',
            isVerified: true,
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
            lastFetched: Date.now(),
          });

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
        window.location.href = withReturn(LOGIN_URL, returnUrl);
      },

      redirectToRegister: (returnUrl?: string) => {
        window.location.href = withReturn(REGISTER_URL, returnUrl);
      },

      logout: () => {
  
        set({ ...initialState });
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
