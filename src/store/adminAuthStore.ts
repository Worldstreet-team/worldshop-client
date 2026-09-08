import { create } from 'zustand';
import { authService } from '@/services/userService';
import { toApiError } from '@/services/api';
import type { User } from '@/types/user.types';

/**
 * Admin console session.
 *
 * Deliberately NOT persisted. The httpOnly session cookie is the only source of
 * truth, and it is the server that decides whether it is still valid — nothing
 * here can be edited in devtools to fake admin access the way a persisted role
 * flag can. The cost is one `/auth/admin/me` round trip per page load, which is
 * the same call that has to happen anyway to know the session is still alive.
 */

type Status = 'unknown' | 'checking' | 'authed' | 'anon';

interface AdminAuthState {
  admin: User | null;
  status: Status;
}

interface AdminAuthActions {
  /** Resolves the cookie against the server. Safe to call repeatedly. */
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState & AdminAuthActions>()((set, get) => ({
  admin: null,
  status: 'unknown',

  checkSession: async () => {
    if (get().status === 'checking') return;
    set({ status: 'checking' });

    try {
      const res = await authService.adminMe();
      set({ admin: res.data.user, status: 'authed' });
    } catch {
      // A 401 here is the normal "not signed in" answer, not an error worth
      // surfacing — the route gate turns it into a redirect.
      set({ admin: null, status: 'anon' });
    }
  },

  login: async (email, password) => {
    try {
      const res = await authService.adminLogin({ email, password });
      set({ admin: res.data.user, status: 'authed' });
    } catch (err) {
      set({ admin: null, status: 'anon' });
      throw toApiError(err, 'Could not sign in. Please try again.');
    }
  },

  logout: async () => {
    try {
      await authService.adminLogout();
    } catch {
      // The cookie is cleared server-side on a best-effort basis; either way the
      // local state goes to anon so the gate redirects.
    }
    set({ admin: null, status: 'anon' });
  },
}));
