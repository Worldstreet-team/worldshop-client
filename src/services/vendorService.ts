import apiClient, { api } from './api';
import type { ApiResponse, PaginatedResponse, Pagination } from '@/types/common.types';
import type { UserProfile } from '@/types/user.types';
import type { Product } from '@/types/product.types';
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
  categoryId: string;
  brand?: string | null;
  material?: string | null;
  weightGrams?: number | null;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  } | null;
  type?: 'PHYSICAL' | 'DIGITAL';
  stock?: number;
  tags?: string[];
  images?: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
    sortOrder: number;
    cloudflareId?: string;
  }>;
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

// ─── Analytics Types ────────────────────────────────────────────

export interface VendorBalanceSummary {
  vendorId: string;
  availableBalance: number;
  totalEarned: number;
  totalCommission: number;
  updatedAt: string;
}

export interface VendorAnalytics {
  vendorId: string;
  period: { from: string | null; to: string | null };
  summary: {
    totalOrders: number;
    totalSales: number;
    totalCommission: number;
    netRevenue: number;
  };
  balance: VendorBalanceSummary;
  earningsOverTime: Array<{
    date: string;
    sales: number;
    commission: number;
    net: number;
  }>;
}

export interface LedgerEntry {
  id: string;
  orderId: string;
  vendorId: string;
  type: 'SALE' | 'COMMISSION' | 'REFUND' | 'COMMISSION_REVERSAL' | 'WITHDRAWAL' | 'WITHDRAWAL_REVERSAL';
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface VendorEarningsFilters {
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
}

// ─── Reviews Types ──────────────────────────────────────────────

export interface VendorReview {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  userId: string;
  userName: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorReviewFilters {
  page?: number;
  limit?: number;
  rating?: number;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export interface DigitalAsset {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sortOrder: number;
  signedUrl?: string;
  createdAt?: string;
}

export interface WithdrawalAccount {
  id: string;
  vendorId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isVerified: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalAccountRequest {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export type WithdrawalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface WithdrawalRequest {
  id: string;
  vendorId: string;
  accountId: string;
  amount: number;
  currency: string;
  status: WithdrawalRequestStatus;
  bankName: string;
  accountNumber: string;
  accountName: string;
  vendorNote?: string | null;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  paidAt?: string | null;
  ledgerEntryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  accountId?: string;
  vendorNote?: string;
}

export interface UploadResult {
  signedUrl: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
}

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

  getWithdrawalAccount: () =>
    api.get<ApiResponse<WithdrawalAccount | null>>('/vendor/withdrawal-account'),

  updateWithdrawalAccount: (data: WithdrawalAccountRequest) =>
    api.put<ApiResponse<WithdrawalAccount>>('/vendor/withdrawal-account', data),

  getWithdrawalRequests: (filters?: { page?: number; limit?: number; status?: WithdrawalRequestStatus }) =>
    api.get<PaginatedResponse<WithdrawalRequest> & { success: boolean }>('/vendor/withdrawals', filters as Record<string, unknown>),

  createWithdrawalRequest: (data: CreateWithdrawalRequest) =>
    api.post<ApiResponse<WithdrawalRequest>>('/vendor/withdrawals', data),

  // ─── Vendor Product endpoints ────────────────────────────────

  /** GET /vendor/products — list vendor's products */
  getProducts: (filters?: VendorProductFilters) =>
    api.get<PaginatedResponse<Product> & { success: boolean }>('/vendor/products', filters as Record<string, unknown>),

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
    api.get<PaginatedResponse<Order> & { success: boolean }>('/vendor/orders', filters as Record<string, unknown>),

  /** GET /vendor/orders/:id — get a single order */
  getOrder: (id: string) =>
    api.get<ApiResponse<Order>>(`/vendor/orders/${id}`),

  /** PATCH /vendor/orders/:id/status — update order status (tracking number required for SHIPPED) */
  updateOrderStatus: (
    id: string,
    data: {
      status:
        | 'PROCESSING'
        | 'PACKAGED'
        | 'SHIPPED'
        | 'OUT_FOR_DELIVERY'
        | 'DELIVERED'
        | 'DELIVERY_FAILED';
      trackingNumber?: string;
      note?: string;
    },
  ) => api.patch<ApiResponse<Order>>(`/vendor/orders/${id}/status`, data),

  /** PATCH /vendor/orders/:id/delivery-date — extend the expected delivery date (delayed delivery) */
  extendDeliveryDate: (id: string, data: { expectedDeliveryDate: string; note?: string }) =>
    api.patch<ApiResponse<Order>>(`/vendor/orders/${id}/delivery-date`, data),

  // ─── Analytics & Balance ─────────────────────────────────────

  /** GET /vendor/analytics/summary — dashboard summary */
  getAnalytics: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<VendorAnalytics>>('/vendor/analytics/summary', params as Record<string, unknown>),

  /** GET /vendor/analytics/earnings — earnings over time (paginated) */
  getEarnings: (filters?: VendorEarningsFilters) =>
    api.get<{ success: boolean; data: LedgerEntry[]; total: number }>('/vendor/analytics/earnings', filters as Record<string, unknown>),

  /** GET /vendor/balance — current wallet balance */
  getBalance: () =>
    api.get<ApiResponse<VendorBalanceSummary>>('/vendor/balance'),

  // ─── Reviews (read-only) ─────────────────────────────────────

  /** GET /vendor/reviews — reviews on vendor's products */
  getReviews: (filters?: VendorReviewFilters) =>
    api.get<{ success: boolean; data: VendorReview[]; pagination: Pagination }>('/vendor/reviews', filters as Record<string, unknown>),

  // ─── File Uploads ────────────────────────────────────────────

  /** POST /vendor/upload/images — upload product images to R2 */
  uploadImages: async (files: File[], folder = 'products'): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const res = await apiClient.post<{ success: boolean; data: UploadResult[] }>(
      `/vendor/upload/images?folder=${folder}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.data;
  },

  /** DELETE /vendor/upload/images — delete images from R2 */
  deleteImages: async (keys: string[]): Promise<void> => {
    await apiClient.delete('/vendor/upload/images', { data: { keys } });
  },

  /** POST /vendor/upload/digital-files — upload digital product files */
  uploadDigitalFiles: async (files: File[]): Promise<UploadResult[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const res = await apiClient.post<{ success: boolean; data: UploadResult[] }>(
      '/vendor/upload/digital-files',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data.data;
  },

  // ─── Digital Asset Management ────────────────────────────────

  /** GET /vendor/products/:id/digital-assets — get product's digital assets */
  getDigitalAssets: (productId: string) =>
    api.get<ApiResponse<DigitalAsset[]>>(`/vendor/products/${productId}/digital-assets`),

  /** POST /vendor/products/:id/digital-assets — attach uploaded files to product */
  attachDigitalAssets: (productId: string, files: { key: string; fileName: string; mimeType: string; fileSize: number }[]) =>
    api.post<ApiResponse<any[]>>(`/vendor/products/${productId}/digital-assets`, { files }),

  /** DELETE /vendor/digital-assets/:assetId — delete a digital asset */
  deleteDigitalAsset: (assetId: string) =>
    api.delete<ApiResponse<null>>(`/vendor/digital-assets/${assetId}`),
};
