import axios, { type AxiosInstance } from 'axios';
import type { User, AuthTokens } from '@/types/user.types';
import type { ApiResponse } from '@/types/common.types';
import { getAccessToken, getRefreshToken } from '@/utils/cookies';

// External auth service base URL
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'https://api.worldstreetgold.com';

/**
 * Create a separate axios instance for external auth service
 * This won't use the main API interceptors
 */
const authClient: AxiosInstance = axios.create({
    baseURL: AUTH_SERVICE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important: Send cookies with requests
});

export const externalAuthService = {
    /**
     * Verify the access token with the auth service
     * This endpoint returns the user's identity if the token is valid
     */
    verifyToken: async (accessToken?: string): Promise<ApiResponse<{ user: User }>> => {
        const token = accessToken || getAccessToken();

        if (!token) {
            throw new Error('No access token available');
        }

        // Local development mode - skip external verification
        if (import.meta.env.VITE_SKIP_AUTH_VERIFICATION === 'true') {
            console.warn('⚠️ Skipping token verification (local dev mode)');
            // Return a mock user for testing
            return {
                success: true,
                message: 'Token valid (dev mode)',
                data: {
                    user: {
                        id: 'dev-user-123',
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User',
                        role: 'ADMIN',
                        isVerified: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                },
            };
        }

        try {
            const response = await authClient.get<ApiResponse<{ user: User }>>('/api/auth/verify', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return response.data;
        } catch (error: unknown) {
            console.error('❌ Token verification failed:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status: number; data: unknown } };
                console.error('Response status:', axiosError.response?.status);
                console.error('Response data:', axiosError.response?.data);
            }
            throw error;
        }
    },

    /**
     * Refresh the access token using the refresh token
     * Can use refresh token from cookies or provide it explicitly
     */
    refreshToken: async (refreshToken?: string): Promise<ApiResponse<{ tokens: AuthTokens }>> => {
        const token = refreshToken || getRefreshToken();

        // If refresh token is provided explicitly, send it in the body
        // Otherwise, the auth service will read it from the cookie
        const requestBody = token ? { refreshToken: token } : undefined;

        const response = await authClient.post<ApiResponse<{ tokens: AuthTokens }>>(
            '/api/auth/refresh-token',
            requestBody
        );

        return response.data;
    },

    /**
     * Logout - revokes the refresh token on the auth service
     * The auth service will clear the cookies automatically
     */
    logout: async (refreshToken?: string): Promise<ApiResponse<{ message: string }>> => {
        const token = refreshToken || getRefreshToken();

        const requestBody = token ? { refreshToken: token } : undefined;

        const response = await authClient.post<ApiResponse<{ message: string }>>(
            '/api/auth/logout',
            requestBody
        );

        return response.data;
    },

    /**
     * Logout from all sessions
     * Requires the access token
     */
    logoutAll: async (accessToken?: string): Promise<ApiResponse<{ message: string }>> => {
        const token = accessToken || getAccessToken();

        if (!token) {
            throw new Error('No access token available');
        }

        const response = await authClient.post<ApiResponse<{ message: string }>>(
            '/api/auth/logout-all',
            undefined,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
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
