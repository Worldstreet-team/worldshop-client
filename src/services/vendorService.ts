import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/common.types';
import type { UserProfile } from '@/types/user.types';
import type { Product, ProductImage } from '@/types/product.types';
import type { Order, OrderStatus } from '@/types/order.types';

export interface RegisterVendorRequest {
  storeName: string;
  storeDescription?: string;
}

export interface VendorProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'newest' | 'oldest';
}

export interface VendorOrderFilters {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'total_asc' | 'total_desc';
}

export interface VendorCreateProductData {
  name: string;
  description: string;
  shortDesc?: string;
  basePrice: number;
  salePrice?: number | null;
  categoryId?: string | null;
  tags?: string[];
  images?: ProductImage[];
  variants?: {
    name: string;
    attributes: Record<string, string>;
    price?: number;
    compareAtPrice?: number;
    stock?: number;
    isActive?: boolean;
  }[];
}

export type VendorUpdateProductData = Partial<VendorCreateProductData>;

export const vendorService = {
  /** POST /vendor/register — register as a vendor */
  register: (data: RegisterVendorRequest) =>
    api.post<ApiResponse<UserProfile>>('/vendor/register', data),

  /** GET /vendor/profile — get vendor profile */
  getProfile: () =>
    api.get<ApiResponse<UserProfile>>('/vendor/profile'),

  /** PATCH /vendor/profile — update vendor store info */
  updateProfile: (data: Partial<RegisterVendorRequest>) =>
    api.patch<ApiResponse<UserProfile>>('/vendor/profile', data),

  // ─── Vendor Product endpoints ────────────────────────────────

  /** GET /vendor/products — list vendor's products */
  getProducts: (filters?: VendorProductFilters) =>
    api.get<PaginatedResponse<Product> & { success: boolean }>('/vendor/products', { params: filters }),

  /** GET /vendor/products/:id — get a single product */
  getProduct: (id: string) =>
    api.get<ApiResponse<Product>>(`/vendor/products/${id}`),

  /** POST /vendor/products — create a new product */
  createProduct: (data: VendorCreateProductData) =>
    api.post<ApiResponse<Product>>('/vendor/products', data),

  /** PUT /vendor/products/:id — update a product */
  updateProduct: (id: string, data: VendorUpdateProductData) =>
    api.put<ApiResponse<Product>>(`/vendor/products/${id}`, data),

  /** DELETE /vendor/products/:id — soft-delete a product */
  deleteProduct: (id: string) =>
    api.delete<ApiResponse<null>>(`/vendor/products/${id}`),

  /** PATCH /vendor/products/:id/toggle — toggle active status */
  toggleProduct: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<Product>>(`/vendor/products/${id}/toggle`, { isActive }),

  // ─── Vendor Order endpoints ──────────────────────────────────

  /** GET /vendor/orders — list vendor's orders */
  getOrders: (filters?: VendorOrderFilters) =>
    api.get<PaginatedResponse<Order> & { success: boolean }>('/vendor/orders', { params: filters }),

  /** GET /vendor/orders/:id — get a single order */
  getOrder: (id: string) =>
    api.get<ApiResponse<Order>>(`/vendor/orders/${id}`),

  /** PATCH /vendor/orders/:id/status — update order status */
  updateOrderStatus: (id: string, data: { status: 'PROCESSING' | 'DELIVERED'; note?: string }) =>
    api.patch<ApiResponse<Order>>(`/vendor/orders/${id}/status`, data),
};
