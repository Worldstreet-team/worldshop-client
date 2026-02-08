import axios, { type AxiosInstance } from 'axios';
import type { User, AuthTokens } from '@/types/user.types';
import type { ApiResponse } from '@/types/common.types';

// External auth service base URL
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'https://api.worldstreetgold.com';

/**
 * Create a separate axios instance for external auth service.
 * withCredentials: true ensures HttpOnly cookies (accessToken, refreshToken)
 * are sent automatically by the browser — we can NOT read them via JS.
 */
const authClient: AxiosInstance = axios.create({
    baseURL: AUTH_SERVICE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

export const externalAuthService = {
    /**
     * Verify the current session with the auth service.
     * The browser sends the HttpOnly accessToken cookie automatically.
     * We do NOT read the cookie via JS — it's HttpOnly and inaccessible.
     *
     * If an explicit token is provided (e.g. from store), it's sent as
     * Authorization header as a fallback.
     */
    verifyToken: async (explicitToken?: string): Promise<ApiResponse<{ user: User }>> => {
        try {
            // Build headers — if we have an explicit token, send it in Authorization.
            // Otherwise rely on the HttpOnly cookie being sent by the browser.
            const headers: Record<string, string> = {};
            if (explicitToken) {
                headers['Authorization'] = `Bearer ${explicitToken}`;
            }

            const response = await authClient.get<ApiResponse<{ user: User }>>('/api/auth/verify', {
                headers,
            });

            return response.data;
        } catch (error: unknown) {
            throw error;
        }
    },

    /**
     * Refresh the access token.
     * The browser sends the HttpOnly refreshToken cookie automatically.
     * If an explicit token is provided, it's sent in the request body.
     */
    refreshToken: async (explicitRefreshToken?: string): Promise<ApiResponse<{ tokens: AuthTokens }>> => {
        const requestBody = explicitRefreshToken ? { refreshToken: explicitRefreshToken } : undefined;

        const response = await authClient.post<ApiResponse<{ tokens: AuthTokens }>>(
            '/api/auth/refresh-token',
            requestBody
        );

        return response.data;
    },

    /**
     * Logout - revokes the refresh token on the auth service.
     * The auth service clears cookies automatically.
     */
    logout: async (explicitRefreshToken?: string): Promise<ApiResponse<{ message: string }>> => {
        const requestBody = explicitRefreshToken ? { refreshToken: explicitRefreshToken } : undefined;

        const response = await authClient.post<ApiResponse<{ message: string }>>(
            '/api/auth/logout',
            requestBody
        );

        return response.data;
    },

    /**
     * Logout from all sessions.
     * Sends HttpOnly accessToken cookie automatically.
     */
    logoutAll: async (explicitAccessToken?: string): Promise<ApiResponse<{ message: string }>> => {
        const headers: Record<string, string> = {};
        if (explicitAccessToken) {
            headers['Authorization'] = `Bearer ${explicitAccessToken}`;
        }

        const response = await authClient.post<ApiResponse<{ message: string }>>(
            '/api/auth/logout-all',
            undefined,
            { headers }
        );

        return response.data;
    },

    /**
     * Redirect to external login page
     */
    redirectToLogin: (returnUrl?: string) => {
        const loginUrl = import.meta.env.VITE_LOGIN_URL || 'https://worldstreetgold.com/login';
        const url = returnUrl ? `${loginUrl}?returnUrl=${encodeURIComponent(returnUrl)}` : loginUrl;
        window.location.href = url;
    },

    /**
     * Redirect to external register page
     */
    redirectToRegister: (returnUrl?: string) => {
        const registerUrl = import.meta.env.VITE_REGISTER_URL || 'https://worldstreetgold.com/register';
        const url = returnUrl ? `${registerUrl}?returnUrl=${encodeURIComponent(returnUrl)}` : registerUrl;
        window.location.href = url;
    },
};
