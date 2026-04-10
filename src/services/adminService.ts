import apiClient, { api } from './api';
import type { Product, Category } from '@/types/product.types';
import type { Order, OrderStatus } from '@/types/order.types';
import type { ApiResponse, PaginatedResponse } from '@/types/common.types';

// ─── Admin Product Types ────────────────────────────────────────
export interface AdminProductFilters {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    status?: 'active' | 'inactive' | 'all';
    stock?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'all';
    sortBy?: string;
}

export interface CreateProductData {
    name: string;
    description: string;
    shortDesc?: string;
    stockKeepingUnit?: string;
    basePrice: number;
    salePrice?: number | null;
    type?: 'PHYSICAL' | 'DIGITAL';
    categoryId?: string | null;
    brand?: string | null;
    tags?: string[];
    images?: ProductImageData[];
    variants?: ProductVariantData[];
    stock?: number;
    lowStockThreshold?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    isNewArrival?: boolean;
}

export interface ProductImageData {
    url: string;
    alt: string;
    isPrimary: boolean;
    sortOrder: number;
    cloudflareId?: string;
}

export interface ProductVariantData {
    name: string;
    stockKeepingUnit?: string;
    attributes: Record<string, string>;
    price?: number;
    compareAtPrice?: number;
    stock: number;
    isActive?: boolean;
}

export type UpdateProductData = Partial<CreateProductData>;

// ─── Admin Category Types ───────────────────────────────────────
export interface CreateCategoryData {
    name: string;
    description?: string | null;
    image?: string | null;
    icon?: string | null;
    parentId?: string | null;
    sortOrder?: number;
    isActive?: boolean;
}

export type UpdateCategoryData = Partial<CreateCategoryData>;

export type AdminCategory = Omit<Category, 'parent' | 'children'> & {
    productCount?: number;
    parent?: { id: string; name: string; slug: string } | null;
    children?: { id: string; name: string; slug: string; isActive: boolean }[];
};

// ─── Dashboard Types ────────────────────────────────────────────
export interface DashboardStats {
    totalProducts: number;
    activeProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCategories: number;
    recentOrders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        total: number;
        customerName: string | null;
        createdAt: string;
        items: Array<{ productName: string; quantity: number; unitPrice: number }>;
    }>;
    recentOrdersPagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasPrevPage: boolean;
        hasNextPage: boolean;
    };
}

// ─── Admin Order Types ──────────────────────────────────────────
export interface AdminOrderFilters {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'newest' | 'oldest' | 'total_asc' | 'total_desc';
}

export interface AdminOrder extends Order {
    payment?: {
        id: string;
        provider: string;
        status: string;
        amount: number;
        reference: string;
        paidAt?: string | null;
    } | null;
}

export interface OrderStats {
    statusCounts: Record<string, number>;
    totalOrders: number;
    totalRevenue: number;
    period: string;
}

export interface UpdateOrderStatusData {
    status: OrderStatus;
    note?: string;
    trackingNumber?: string;
}

// ─── Admin Inventory Types ──────────────────────────────────────
export interface AdminInventoryFilters {
    page?: number;
    limit?: number;
    search?: string;
    stock?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'all';
    categoryId?: string;
    sortBy?: 'name_asc' | 'name_desc' | 'stock_asc' | 'stock_desc' | 'newest' | 'oldest';
}

export interface InventoryItem {
    id: string;
    name: string;
    slug: string;
    sku: string | null;
    type: string;
    image: string | null;
    stock: number;
    lowStockThreshold: number;
    status: 'in-stock' | 'low-stock' | 'out-of-stock';
    categoryName: string | null;
    variants: Array<{
        id: string;
        name: string;
        sku: string | null;
        stock: number;
    }>;
}

export interface InventoryStats {
    totalProducts: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
}

export interface AdjustStockData {
    adjustment: number;
    reason: string;
    variantId?: string;
}

export interface AdjustStockResult {
    productId: string;
    variantId: string | null;
    previousStock: number;
    adjustment: number;
    newStock: number;
    reason: string;
}

export interface LowStockAlert {
    id: string;
    name: string;
    sku: string | null;
    stock: number;
    lowStockThreshold: number;
    categoryName: string | null;
}

// ─── Upload Types ───────────────────────────────────────────────
export interface UploadResult {
    signedUrl: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
}

// ─── Admin Vendor Types ─────────────────────────────────────────
export interface AdminVendorFilters {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
    search?: string;
    sortBy?: 'newest' | 'oldest' | 'name_asc' | 'name_desc';
}

export interface AdminVendor {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    vendorStatus: string;
    storeName: string | null;
    storeSlug: string | null;
    storeDescription: string | null;
    vendorSince: string | null;
    productCount: number;
    totalEarnings: number;
}

export interface AdminVendorDetail {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    vendorStatus: string;
    storeName: string | null;
    storeSlug: string | null;
    storeDescription: string | null;
    vendorSince: string | null;
    createdAt: string;
    stats: {
        productCount: number;
        orderCount: number;
        totalEarnings: number;
        totalCommission: number;
        availableBalance: number;
    };
    recentOrders: Array<{
        id: string;
        orderNumber: string;
        status: string;
        total: number;
        createdAt: string;
    }>;
}

export interface CommissionReport {
    period: { from: string | null; to: string | null };
    platform: {
        totalOrders: number;
        totalSales: number;
        totalCommission: number;
        netToVendors: number;
        commissionRate: number;
    };
    vendors: Array<{
        vendorId: string;
        vendorName: string;
        totalOrders: number;
        totalSales: number;
        totalCommission: number;
        netRevenue: number;
    }>;
}

export interface CommissionSetting {
    key: string;
    value: number;
}

// ─── Admin Service ──────────────────────────────────────────────
export const adminService = {
    // Dashboard
    getDashboardStats: async (page = 1, limit = 15): Promise<DashboardStats> => {
        const res = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats', {
            params: { page, limit },
        });
        return res.data;
    },

    // Products
    getProducts: async (filters?: AdminProductFilters): Promise<PaginatedResponse<Product>> => {
        const res = await api.get<{ success: boolean; data: Product[]; pagination: PaginatedResponse<Product>['pagination'] }>(
            '/admin/products', filters as Record<string, unknown>);
        return { data: res.data, pagination: res.pagination };
    },

    getProduct: async (id: string): Promise<Product> => {
        const res = await api.get<ApiResponse<Product>>(`/admin/products/${id}`);
        return res.data;
    },

    createProduct: async (data: CreateProductData): Promise<Product> => {
        const res = await api.post<ApiResponse<Product>>('/admin/products', data);
        return res.data;
    },

    updateProduct: async (id: string, data: UpdateProductData): Promise<Product> => {
        const res = await api.put<ApiResponse<Product>>(`/admin/products/${id}`, data);
        return res.data;
    },

    deleteProduct: async (id: string): Promise<void> => {
        await api.delete(`/admin/products/${id}`);
    },

    // Categories
    getCategories: async (includeInactive = true): Promise<AdminCategory[]> => {
        const res = await api.get<ApiResponse<AdminCategory[]>>('/admin/categories', { includeInactive: String(includeInactive) });
        return res.data;
    },

    getCategory: async (id: string): Promise<AdminCategory> => {
        const res = await api.get<ApiResponse<AdminCategory>>(`/admin/categories/${id}`);
        return res.data;
    },

    createCategory: async (data: CreateCategoryData): Promise<AdminCategory> => {
        const res = await api.post<ApiResponse<AdminCategory>>('/admin/categories', data);
        return res.data;
    },

    updateCategory: async (id: string, data: UpdateCategoryData): Promise<AdminCategory> => {
        const res = await api.put<ApiResponse<AdminCategory>>(`/admin/categories/${id}`, data);
        return res.data;
    },

    deleteCategory: async (id: string, moveProductsTo?: string): Promise<void> => {
        await apiClient.delete('/admin/categories/' + id, { data: { moveProductsTo } });
    },

    // Image Uploads
    uploadImages: async (files: File[], folder = 'products'): Promise<UploadResult[]> => {
        const formData = new FormData();
        files.forEach((file) => formData.append('images', file));

        const res = await apiClient.post<{ success: boolean; data: UploadResult[] }>(
            `/admin/upload/images?folder=${folder}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return res.data.data;
    },

    deleteUploadedImages: async (keys: string[]): Promise<void> => {
        await apiClient.delete('/admin/upload/images', { data: { keys } });
    },

    // Digital File Uploads
    uploadDigitalFiles: async (files: File[]): Promise<UploadResult[]> => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));

        const res = await apiClient.post<{ success: boolean; data: UploadResult[] }>(
            '/admin/upload/digital-files',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return res.data.data;
    },

    // Digital Assets for a product
    getDigitalAssets: async (productId: string) => {
        const res = await api.get<ApiResponse<any[]>>(`/admin/products/${productId}/digital-assets`);
        return res.data;
    },

    attachDigitalAssets: async (productId: string, assets: Array<{ fileName: string; r2Key: string; mimeType: string; fileSize: number; sortOrder?: number }>) => {
        const res = await api.post<ApiResponse<any[]>>(`/admin/products/${productId}/digital-assets`, { assets });
        return res.data;
    },

    deleteDigitalAsset: async (assetId: string): Promise<void> => {
        await api.delete(`/admin/digital-assets/${assetId}`);
    },

    // ─── Orders ─────────────────────────────────────────────────
    getOrders: async (filters?: AdminOrderFilters): Promise<PaginatedResponse<AdminOrder>> => {
        const res = await api.get<{ success: boolean; data: AdminOrder[]; pagination: PaginatedResponse<AdminOrder>['pagination'] }>(
            '/admin/orders', filters as Record<string, unknown>);
        return { data: res.data, pagination: res.pagination };
    },

    getOrder: async (id: string): Promise<AdminOrder> => {
        const res = await api.get<ApiResponse<AdminOrder>>(`/admin/orders/${id}`);
        return res.data;
    },

    getOrderStats: async (period = '30d'): Promise<OrderStats> => {
        const res = await api.get<ApiResponse<OrderStats>>('/admin/orders/stats', { period });
        return res.data;
    },

    updateOrderStatus: async (id: string, data: UpdateOrderStatusData): Promise<AdminOrder> => {
        const res = await api.patch<ApiResponse<AdminOrder>>(`/admin/orders/${id}/status`, data);
        return res.data;
    },

    // ─── Inventory ──────────────────────────────────────────────
    getInventory: async (filters?: AdminInventoryFilters): Promise<PaginatedResponse<InventoryItem>> => {
        const res = await api.get<{ success: boolean; data: InventoryItem[]; pagination: PaginatedResponse<InventoryItem>['pagination'] }>(
            '/admin/inventory', filters as Record<string, unknown>);
        return { data: res.data, pagination: res.pagination };
    },

    getInventoryStats: async (): Promise<InventoryStats> => {
        const res = await api.get<ApiResponse<InventoryStats>>('/admin/inventory/stats');
        return res.data;
    },

    getLowStockAlerts: async (): Promise<LowStockAlert[]> => {
        const res = await api.get<ApiResponse<LowStockAlert[]>>('/admin/inventory/low-stock');
        return res.data;
    },

    adjustStock: async (productId: string, data: AdjustStockData): Promise<AdjustStockResult> => {
        const res = await api.patch<ApiResponse<AdjustStockResult>>(`/admin/inventory/${productId}/adjust`, data);
        return res.data;
    },

    updateThreshold: async (productId: string, lowStockThreshold: number): Promise<{ productId: string; previousThreshold: number; newThreshold: number }> => {
        const res = await api.patch<ApiResponse<{ productId: string; previousThreshold: number; newThreshold: number }>>(
            `/admin/inventory/${productId}/threshold`, { lowStockThreshold });
        return res.data;
    },

    // ─── Vendor Management ──────────────────────────────────────
    getVendors: async (filters?: AdminVendorFilters): Promise<PaginatedResponse<AdminVendor>> => {
        const res = await api.get<{ success: boolean; data: AdminVendor[]; pagination: PaginatedResponse<AdminVendor>['pagination'] }>(
            '/admin/vendors', filters as Record<string, unknown>);
        return { data: res.data, pagination: res.pagination };
    },

    getVendor: async (id: string): Promise<AdminVendorDetail> => {
        const res = await api.get<ApiResponse<AdminVendorDetail>>(`/admin/vendors/${id}`);
        return res.data;
    },

    updateVendorStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED'): Promise<AdminVendor> => {
        const res = await api.patch<ApiResponse<AdminVendor>>(`/admin/vendors/${id}/status`, { status });
        return res.data;
    },

    getVendorProducts: async (id: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Product>> => {
        const res = await api.get<{ success: boolean; data: Product[]; pagination: PaginatedResponse<Product>['pagination'] }>(
            `/admin/vendors/${id}/products`, params as Record<string, unknown>);
        return { data: res.data, pagination: res.pagination };
    },

    // ─── Commission & Reports ───────────────────────────────────
    getCommissionReport: async (params?: { from?: string; to?: string }): Promise<CommissionReport> => {
        const res = await api.get<ApiResponse<CommissionReport>>('/admin/reports/commission', params as Record<string, unknown>);
        return res.data;
    },

    getCommissionRate: async (): Promise<CommissionSetting> => {
        const res = await api.get<ApiResponse<CommissionSetting>>('/admin/settings/commission');
        return res.data;
    },

    updateCommissionRate: async (rate: number): Promise<CommissionSetting> => {
        const res = await api.patch<ApiResponse<CommissionSetting>>('/admin/settings/commission', { rate });
        return res.data;
    },
};
