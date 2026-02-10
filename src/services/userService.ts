import { api } from './api';
import type {
  User,
  Address,
  Wishlist,
  CreateAddressRequest,
  UpdateAddressRequest,
  AuthTokens,
  LoginRequest,
  RegisterRequest
} from '@/types/user.types';
import type { ApiResponse } from '@/types/common.types';

export const authService = {
  // Login
  login: (data: LoginRequest) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', data),

  // Register
  register: (data: RegisterRequest) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/register', data),

  // Logout
  logout: () =>
    api.post<ApiResponse<{ message: string }>>('/auth/logout'),

  // Refresh token
  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),

  // Get current user profile
  getProfile: () =>
    api.get<ApiResponse<User>>('/auth/me'),

  // Update profile
  updateProfile: (data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>) =>
    api.patch<ApiResponse<User>>('/auth/me', data),

  // Change password
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse<{ message: string }>>('/auth/change-password', data),

  // Request password reset
  requestPasswordReset: (email: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  // Reset password
  resetPassword: (data: { token: string; password: string }) =>
    api.post<ApiResponse<{ message: string }>>('/auth/reset-password', data),
};

export const addressService = {
  // Get user addresses
  getAddresses: () =>
    api.get<ApiResponse<Address[]>>('/addresses'),

  // Get single address
  getAddressById: (id: string) =>
    api.get<ApiResponse<Address>>(`/addresses/${id}`),

  // Create address
  createAddress: (data: CreateAddressRequest) =>
    api.post<ApiResponse<Address>>('/addresses', data),

  // Update address
  updateAddress: (id: string, data: UpdateAddressRequest) =>
    api.put<ApiResponse<Address>>(`/addresses/${id}`, data),

  // Delete address
  deleteAddress: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/addresses/${id}`),

  // Set as default
  setDefaultAddress: (id: string) =>
    api.patch<ApiResponse<Address>>(`/addresses/${id}/default`),
};

export const wishlistService = {
  // Get wishlist
  getWishlist: () =>
    api.get<{ success: boolean; wishlist: Wishlist }>('/wishlist'),

  // Add item to wishlist
  addToWishlist: (productId: string) =>
    api.post<{ success: boolean; wishlist: Wishlist }>('/wishlist/items', { productId }),

  // Remove from wishlist
  removeFromWishlist: (productId: string) =>
    api.delete<{ success: boolean; wishlist: Wishlist }>(`/wishlist/items/${productId}`),

  // Check if product is in wishlist
  isInWishlist: (productId: string) =>
    api.get<{ success: boolean; inWishlist: boolean }>(`/wishlist/check/${productId}`),
};
