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

    // Multipart uploads must not inherit the instance's JSON content type.
    // Axios v1 checks for a JSON content type in transformRequest — before the
    // adapter's FormData handling — and when it finds one it serialises the
    // FormData with formDataToJSON(), so the files are dropped and the server
    // receives a JSON body its multipart parser cannot read. Clearing the
    // header lets the browser set multipart/form-data with a real boundary.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.delete('Content-Type');
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
    // W5 FIX: On 401, attempt one token refresh before giving up
    type RetriableConfig = typeof error.config & { _retried?: boolean };
    if (error.response?.status === 401 && error.config && !(error.config as RetriableConfig)._retried) {
      (error.config as RetriableConfig)._retried = true;
      if (clerkGetToken) {
        try {
          const freshToken = await clerkGetToken();
          if (freshToken) {
            error.config.headers.Authorization = `Bearer ${freshToken}`;
            return apiClient.request(error.config);
          }
        } catch {
          // Token refresh failed — fall through to rejection
        }
      }
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

/**
 * The response interceptor above rejects with a flat object — NOT an axios
 * error — so `err.response` never exists on what callers catch. This is the
 * one shape every catch block should read.
 */
export type NormalizedApiError = {
  message: string;
  statusCode?: number;
  /** Per-field messages from the server's zod validation, keyed by field path. */
  errors?: Record<string, string>;
};

export function toApiError(err: unknown, fallback: string): NormalizedApiError {
  const e = (err ?? {}) as { message?: unknown; statusCode?: number; errors?: unknown };
  const errors =
    e.errors && typeof e.errors === 'object' && !Array.isArray(e.errors)
      ? (e.errors as Record<string, string>)
      : undefined;
  return {
    message: typeof e.message === 'string' && e.message ? e.message : fallback,
    statusCode: e.statusCode,
    errors,
  };
}

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
