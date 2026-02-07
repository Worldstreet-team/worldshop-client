import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens } from '@/types/user.types';
import { authService } from '@/services/userService';
import { cartService } from '@/services/cartService';
import { useCartStore } from './cartStore';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          const { user, tokens } = response.data;
          
          set({ 
            user, 
            tokens, 
            isAuthenticated: true, 
            isLoading: false 
          });

          // Merge guest cart if exists
          const sessionId = localStorage.getItem('sessionId');
          if (sessionId) {
            try {
              await cartService.mergeCart(sessionId);
              localStorage.removeItem('sessionId');
              // Refresh cart state
              await useCartStore.getState().fetchCart();
            } catch {
              // Silent fail - cart merge is not critical
            }
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: (error as { message: string }).message || 'Login failed'
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);
          const { user, tokens } = response.data;
          
          set({ 
            user, 
            tokens, 
            isAuthenticated: true, 
            isLoading: false 
          });

          // Merge guest cart if exists
          const sessionId = localStorage.getItem('sessionId');
          if (sessionId) {
            try {
              await cartService.mergeCart(sessionId);
              localStorage.removeItem('sessionId');
              await useCartStore.getState().fetchCart();
            } catch {
              // Silent fail
            }
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: (error as { message: string }).message || 'Registration failed'
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Silent fail - logout anyway
        }
        
        // Clear auth state
        set(initialState);
        
        // Clear cart
        useCartStore.getState().clearLocalCart();
        
        // Generate new session ID for guest cart
        localStorage.setItem('sessionId', crypto.randomUUID());
      },

      refreshAccessToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          throw new Error('No refresh token');
        }

        try {
          const response = await authService.refreshToken(tokens.refreshToken);
          set({ tokens: response.data });
        } catch {
          // Refresh failed - clear auth
          set(initialState);
          throw new Error('Session expired');
        }
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      clearError: () => set({ error: null }),

      checkAuth: async () => {
        const { tokens, isAuthenticated } = get();
        
        if (!tokens?.accessToken || !isAuthenticated) {
          return;
        }

        // Verify token is still valid
        try {
          const response = await authService.getProfile();
          set({ user: response.data });
        } catch {
          // Token invalid - clear auth
          set(initialState);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
