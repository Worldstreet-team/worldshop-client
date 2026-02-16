import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Holds a reference to the Clerk `getToken` function.
 * Set from a React component via `setClerkTokenGetter`.
 */
let clerkGetToken: (() => Promise<string | null>) | null = null;

/** Call this once from a React component that has access to Clerk's useAuth(). */
export function setClerkTokenGetter(getter: () => Promise<string | null>) {
  clerkGetToken = getter;
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach Clerk session token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get Clerk session token
    if (clerkGetToken) {
      try {
        const token = await clerkGetToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Token fetch failed — proceed without auth header
      }
    }

    // Include session ID for guest cart
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      config.headers['X-Session-ID'] = sessionId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    // Handle 401 — Clerk session expired, redirect to login
    if (error.response?.status === 401) {
      // Clerk handles token refresh automatically.
      // If we still get 401, the session is truly expired.
      // Don't auto-redirect — let the UI handle it gracefully.
      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    // Handle other errors
    const errorMessage =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      message: errorMessage,
      statusCode: error.response?.status,
      errors: (error.response?.data as { errors?: Record<string, string[]> })?.errors,
    });
  }
);

export default apiClient;

// Helper functions for common request methods
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<T>(url, { params }).then(res => res.data),

  post: <T>(url: string, data?: unknown) =>
    apiClient.post<T>(url, data).then(res => res.data),

  put: <T>(url: string, data?: unknown) =>
    apiClient.put<T>(url, data).then(res => res.data),

  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<T>(url, data).then(res => res.data),

  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then(res => res.data),
};
