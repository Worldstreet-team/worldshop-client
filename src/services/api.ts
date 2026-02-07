import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();
    
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
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
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { tokens, refreshAccessToken, logout } = useAuthStore.getState();
      
      if (tokens?.refreshToken) {
        try {
          await refreshAccessToken();
          const newTokens = useAuthStore.getState().tokens;
          
          if (newTokens?.accessToken) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        logout();
        window.location.href = '/login';
      }
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
