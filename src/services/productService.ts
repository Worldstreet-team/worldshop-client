import { api } from './api';
import type {
  Product,
  Category,
  Review,
  ProductFilters
} from '@/types/product.types';
import type { ApiResponse, PaginatedResponse } from '@/types/common.types';

// No field mapping needed — frontend types match backend Prisma fields directly.

// ─── Product Service ────────────────────────────────────────────

export const productService = {
  // Get paginated products with filters
  getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const res = await api.get<{ success: boolean; data: Product[]; pagination: PaginatedResponse<Product>['pagination'] }>(
      '/products',
      filters as Record<string, unknown>,
    );
    return { data: res.data, pagination: res.pagination };
  },

  // Get single product by slug
  getProductBySlug: async (slug: string): Promise<Product | null> => {
    const res = await api.get<ApiResponse<Product>>(`/products/${slug}`);
    return res.data ?? null;
  },

  // Get single product by ID
  getProductById: async (id: string): Promise<Product | null> => {
    const res = await api.get<ApiResponse<Product>>(`/products/id/${id}`);
    return res.data ?? null;
  },

  // Get featured products
  getFeaturedProducts: async (limit = 8): Promise<Product[]> => {
    const res = await api.get<ApiResponse<Product[]>>('/products/featured', { limit });
    return res.data;
  },

  // Get related products
  getRelatedProducts: async (productId: string, limit = 8): Promise<Product[]> => {
    const res = await api.get<ApiResponse<Product[]>>(`/products/${productId}/related`, { limit });
    return res.data;
  },

  // Search products
  searchProducts: async (query: string, limit = 10): Promise<Product[]> => {
    const res = await api.get<ApiResponse<Product[]>>('/products/search', { q: query, limit });
    return res.data;
  },

  // Get price range for filter UI
  getPriceRange: async (): Promise<{ min: number; max: number }> => {
    const res = await api.get<ApiResponse<{ min: number; max: number }>>('/products/price-range');
    return res.data;
  },

  // Get all brands for filter UI
  getBrands: async (): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>('/products/brands');
    return res.data;
  },

  // Get product reviews (stays mock for now)
  getProductReviews: (productId: string, page = 1, limit = 10) =>
    api.get<PaginatedResponse<Review>>(`/products/${productId}/reviews`, { page, limit }),

  // Add product review (requires auth)
  addProductReview: (productId: string, data: { rating: number; title?: string; comment: string }) =>
    api.post<ApiResponse<Review>>(`/products/${productId}/reviews`, data),
};

// ─── Category Service ───────────────────────────────────────────

export const categoryService = {
  // Get all categories (flat list with product count)
  getCategories: async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    return res.data;
  },

  // Get featured categories for homepage (same as getCategories but limited)
  getFeaturedCategories: async (limit = 4): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories/featured', { limit });
    return res.data;
  },

  // Get single category by slug with products
  getCategoryBySlug: async (slug: string, filters?: ProductFilters) => {
    const res = await api.get<ApiResponse<{ category: Category; products: PaginatedResponse<Product> }>>(
      `/categories/${slug}`,
      filters as Record<string, unknown>,
    );
    return res.data;
  },

  // Get category by ID
  getCategoryById: async (id: string): Promise<Category | null> => {
    const res = await api.get<ApiResponse<Category>>(`/categories/id/${id}`);
    return res.data ?? null;
  },
};
