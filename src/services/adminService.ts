import apiClient, { api } from './api';
import type { Product, Category } from '@/types/product.types';
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
        createdAt: string;
        items: Array<{ productName: string; quantity: number; unitPrice: number }>;
    }>;
}

// ─── Upload Types ───────────────────────────────────────────────
export interface UploadResult {
    signedUrl: string;
    key: string;
    originalName: string;
    size: number;
    mimeType: string;
}

// ─── Admin Service ──────────────────────────────────────────────
export const adminService = {
    // Dashboard
    getDashboardStats: async (): Promise<DashboardStats> => {
        const res = await api.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
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
};
