import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens } from '@/types/user.types';
import { externalAuthService } from '@/services/externalAuthService';
import { useCartStore } from './cartStore';
import { getAccessToken, getRefreshToken, clearAuthCookies } from '@/utils/cookies';

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

  // Check for common network error messages
  if ('message' in error) {
    const msg = (error as { message: string }).message?.toLowerCase() || '';
    if (msg.includes('network error') || msg.includes('cors') || msg.includes('timeout')) {
      return true;
    }
  }

  return false;
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
       * Initialize authentication on app load
       * - Get access token from cookies
       * - Verify token with external auth service
       * - If invalid, try to refresh using refresh token
       * - If refresh fails, redirect to login
       */
      initializeAuth: async () => {
        const { isInitialized } = get();

        // Prevent multiple initializations
        if (isInitialized) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Step 1: Get access token — check cookies first, then fall back to persisted store
          const accessToken = getAccessToken() || get().tokens?.accessToken || null;
          const refreshToken = getRefreshToken() || get().tokens?.refreshToken || null;

          if (!accessToken) {
            console.log('ℹ️ No access token found (cookies or store). User is not authenticated.');
            set({
              isLoading: false,
              isInitialized: true,
              isAuthenticated: false,
              user: null,
              tokens: null,
            });
            return;
          }

          console.log('🔍 Access token found, verifying with auth service...');

          // Step 2: Verify the access token
          try {
            const response = await externalAuthService.verifyToken(accessToken);
            const user = response.data.user;

            console.log('✅ Token verified successfully:', user.email);

            set({
              user,
              tokens: {
                accessToken,
                refreshToken: refreshToken || '',
                expiresAt: Date.now() + (15 * 60 * 1000),
              },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });

            try {
              await useCartStore.getState().fetchCart();
            } catch {
              // Silent fail
            }
            return;

          } catch (verifyError) {
            // Was it a network/CORS error or a real auth rejection?
            if (isNetworkError(verifyError)) {
              // Auth service is unreachable (CORS, network, timeout)
              // DON'T clear tokens — they might be valid, service is just down
              console.warn('⚠️ Auth service unreachable. Keeping tokens for later retry.');
              console.warn('   This is normal for local dev if auth service is on a different domain.');

              // If we have persisted user data, use it as best-effort
              const persistedUser = get().user;
              if (persistedUser) {
                console.log('✅ Using cached user data:', persistedUser.email);
                set({
                  tokens: {
                    accessToken,
                    refreshToken: refreshToken || '',
                    expiresAt: Date.now() + (15 * 60 * 1000),
                  },
                  isAuthenticated: true,
                  isLoading: false,
                  isInitialized: true,
                });
                return;
              }

              // No cached user — mark as not authenticated but don't clear tokens
              set({
                tokens: {
                  accessToken,
                  refreshToken: refreshToken || '',
                  expiresAt: Date.now() + (15 * 60 * 1000),
                },
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
                error: 'Auth service unreachable. Please try again later.',
              });
              return;
            }

            // Real auth error (401, 403, etc.) — token is actually invalid
            console.warn('⚠️ Access token rejected by auth service, attempting refresh...');

            // Step 3: Try to refresh
            if (refreshToken) {
              try {
                const newAccessToken = await get().refreshAccessToken();

                if (newAccessToken) {
                  console.log('✅ Token refreshed, re-verifying...');
                  const response = await externalAuthService.verifyToken(newAccessToken);
                  const user = response.data.user;

                  set({
                    user,
                    tokens: {
                      accessToken: newAccessToken,
                      refreshToken: getRefreshToken() || get().tokens?.refreshToken || '',
                      expiresAt: Date.now() + (15 * 60 * 1000),
                    },
                    isAuthenticated: true,
                    isLoading: false,
                    isInitialized: true,
                  });

                  try {
                    await useCartStore.getState().fetchCart();
                  } catch {
                    // Silent fail
                  }
                  return;
                }
              } catch (refreshError) {
                if (isNetworkError(refreshError)) {
                  console.warn('⚠️ Refresh failed due to network error. Keeping tokens.');
                  set({
                    isLoading: false,
                    isInitialized: true,
                    error: 'Auth service unreachable during refresh.',
                  });
                  return;
                }
                console.error('❌ Token refresh rejected:', refreshError);
              }
            }

            // Step 4: Auth truly failed (not a network issue)
            console.warn('⚠️ Authentication failed. Tokens are invalid.');
            set({
              ...initialState,
              isLoading: false,
              isInitialized: true
            });
            clearAuthCookies();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);

          if (isNetworkError(error)) {
            // Network error — don't clear anything
            set({
              isLoading: false,
              isInitialized: true,
              error: 'Auth service unreachable'
            });
            return;
          }

          set({
            ...initialState,
            isLoading: false,
            isInitialized: true,
            error: 'Failed to initialize authentication'
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
          await externalAuthService.logout();
        } catch (error) {
          console.error('Logout error:', error);
          // Continue with local logout even if API call fails
        }

        // Clear auth state
        set({
          ...initialState,
          isInitialized: true,
          isLoading: false
        });

        // Clear cookies
        clearAuthCookies();

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
          await externalAuthService.logoutAll();
        } catch (error) {
          console.error('Logout all error:', error);
        }

        // Clear auth state
        set({
          ...initialState,
          isInitialized: true,
          isLoading: false
        });

        // Clear cookies
        clearAuthCookies();

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
          const response = await externalAuthService.refreshToken();
          const tokens = response.data.tokens;

          // Update tokens in state (cookies are updated by auth service)
          set({
            tokens: {
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes from now
            }
          });

          return tokens.accessToken;
        } catch (error) {
          console.error('Token refresh failed:', error);

          if (isNetworkError(error)) {
            // Network error — don't clear anything, service is unreachable
            console.warn('⚠️ Refresh failed due to network error. Keeping existing tokens.');
            return null;
          }

          // Real auth error — refresh token is invalid/revoked
          set({
            ...initialState,
            isInitialized: true
          });
          // Only clear cookies for real auth failures, not network issues
          clearAuthCookies();

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
