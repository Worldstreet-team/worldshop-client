import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens } from '@/types/user.types';
import { externalAuthService } from '@/services/externalAuthService';
import { useCartStore } from './cartStore';

/**
 * Check if an error is a network/CORS error (service unreachable)
 * vs an actual authentication error (401/403)
 */
function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  // Axios wraps network errors without a response
  if ('response' in error && !(error as { response?: unknown }).response) {
    return true; // No response = network error / CORS
  }

  if ('message' in error) {
    const msg = (error as { message: string }).message?.toLowerCase() || '';
    if (msg.includes('network error') || msg.includes('cors') || msg.includes('timeout')) {
      return true;
    }
  }

  return false;
}

/**
 * Get the HTTP status from an axios error, or 0 if network error
 */
function getErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { status: number } }).response;
    return resp?.status ?? 0;
  }
  return 0;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  redirectToLogin: (returnUrl?: string) => void;
  redirectToRegister: (returnUrl?: string) => void;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Initialize authentication on app load.
       *
       * Cookies are HttpOnly — JS cannot read them. Instead we just
       * fire the verify request and let the browser attach the cookies.
       *
       * Flow:
       *  1. Call GET /api/auth/verify  (browser sends HttpOnly accessToken cookie)
       *  2. If 200 → authenticated
       *  3. If 401 → try POST /api/auth/refresh-token (browser sends HttpOnly refreshToken cookie)
       *  4. If refresh 200 → verify again
       *  5. If refresh fails → not authenticated
       */
      initializeAuth: async () => {
        const { isInitialized } = get();
        if (isInitialized) return;

        set({ isLoading: true, error: null });

        try {
          // ---------- Step 1: Try to verify (cookie sent automatically) ----------
          console.log('🔍 Verifying session with auth service...');

          try {
            // If we have a token stored from a previous refresh, send it explicitly too
            const storedToken = get().tokens?.accessToken || undefined;
            const response = await externalAuthService.verifyToken(storedToken);
            const user = response.data.user;

            console.log('✅ Session verified:', user.email);
            set({
              user,
              tokens: {
                accessToken: 'httponly', // Placeholder — real token is in the cookie
                refreshToken: 'httponly',
                expiresAt: Date.now() + (15 * 60 * 1000),
              },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });

            try { await useCartStore.getState().fetchCart(); } catch { /* silent */ }
            return;

          } catch (verifyError) {
            const status = getErrorStatus(verifyError);

            if (isNetworkError(verifyError)) {
              console.warn('⚠️ Auth service unreachable (network/CORS).');
              // Fall back to cached user if we have one
              const cached = get().user;
              if (cached) {
                console.log('✅ Using cached user:', cached.email);
                set({ isAuthenticated: true, isLoading: false, isInitialized: true });
                return;
              }
              set({
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
                error: 'Auth service unreachable. Please try again later.',
              });
              return;
            }

            // 401 means token expired or missing — try refresh
            if (status === 401) {
              console.log('🔄 Access token expired/missing, refreshing...');

              // ---------- Step 2: Refresh ----------
              try {
                const newAccessToken = await get().refreshAccessToken();

                if (newAccessToken) {
                  // ---------- Step 3: Re-verify with new token ----------
                  console.log('🔍 Re-verifying with new token...');
                  const response = await externalAuthService.verifyToken(newAccessToken);
                  const user = response.data.user;

                  console.log('✅ Session restored:', user.email);
                  set({
                    user,
                    tokens: {
                      accessToken: newAccessToken,
                      refreshToken: 'httponly',
                      expiresAt: Date.now() + (15 * 60 * 1000),
                    },
                    isAuthenticated: true,
                    isLoading: false,
                    isInitialized: true,
                  });

                  try { await useCartStore.getState().fetchCart(); } catch { /* silent */ }
                  return;
                }
              } catch (refreshError) {
                if (isNetworkError(refreshError)) {
                  console.warn('⚠️ Refresh failed — auth service unreachable.');
                  set({ isLoading: false, isInitialized: true, error: 'Auth service unreachable during refresh.' });
                  return;
                }
                console.error('❌ Refresh token rejected:', refreshError);
              }
            }

            // Any other status or refresh failed → not authenticated
            console.log('ℹ️ User is not authenticated.');
            set({
              ...initialState,
              isLoading: false,
              isInitialized: true,
            });
          }

        } catch (error) {
          console.error('Auth initialization error:', error);
          set({
            ...(isNetworkError(error) ? {} : initialState),
            isLoading: false,
            isInitialized: true,
            error: isNetworkError(error) ? 'Auth service unreachable' : 'Failed to initialize authentication',
          });
        }
      },

      /**
       * Logout from current session
       * - Call external auth service to revoke refresh token
       * - Clear local state and cookies
       * - Generate new session ID for guest cart
       */
      logout: async () => {
        set({ isLoading: true });

        try {
          // Auth service clears HttpOnly cookies server-side
          await externalAuthService.logout();
        } catch (error) {
          console.error('Logout error:', error);
          // Continue with local logout even if API call fails
        }

        // Clear local auth state
        set({
          ...initialState,
          isInitialized: true,
          isLoading: false,
        });

        // Clear cart
        useCartStore.getState().clearLocalCart();

        // Generate new session ID for guest cart
        localStorage.setItem('sessionId', crypto.randomUUID());

        // Redirect to login
        externalAuthService.redirectToLogin();
      },

      /**
       * Logout from all sessions
       * - Revokes all refresh tokens for the user
       */
      logoutAll: async () => {
        set({ isLoading: true });

        try {
          // Auth service clears HttpOnly cookies for all sessions server-side
          await externalAuthService.logoutAll();
        } catch (error) {
          console.error('Logout all error:', error);
        }

        // Clear local auth state
        set({
          ...initialState,
          isInitialized: true,
          isLoading: false,
        });

        // Clear cart
        useCartStore.getState().clearLocalCart();

        // Generate new session ID for guest cart
        localStorage.setItem('sessionId', crypto.randomUUID());

        // Redirect to login
        externalAuthService.redirectToLogin();
      },

      /**
       * Refresh the access token
       * - Uses refresh token from cookies
       * - Returns new access token or null if refresh fails
       */
      refreshAccessToken: async (): Promise<string | null> => {
        try {
          // Browser sends HttpOnly refreshToken cookie automatically
          const response = await externalAuthService.refreshToken();
          const tokens = response.data.tokens;

          // Store tokens locally (as fallback for Authorization header)
          set({
            tokens: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken || 'httponly',
              expiresAt: Date.now() + (15 * 60 * 1000),
            },
          });

          return tokens.accessToken;
        } catch (error) {
          console.error('Token refresh failed:', error);

          if (isNetworkError(error)) {
            console.warn('⚠️ Refresh failed due to network error. Keeping existing tokens.');
            return null;
          }

          // Real auth error — refresh token is invalid/revoked
          set({
            ...initialState,
            isInitialized: true,
          });

          return null;
        }
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      clearError: () => set({ error: null }),

      /**
       * Redirect to external login page
       */
      redirectToLogin: (returnUrl?: string) => {
        externalAuthService.redirectToLogin(returnUrl);
      },

      /**
       * Redirect to external register page
       */
      redirectToRegister: (returnUrl?: string) => {
        externalAuthService.redirectToRegister(returnUrl);
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
