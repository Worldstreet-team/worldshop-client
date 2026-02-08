import { api } from './api';
import type { 
  Product, 
  ProductImage,
  ProductVariant,
  Category, 
  Review, 
  ProductFilters 
} from '@/types/product.types';
import type { ApiResponse, PaginatedResponse } from '@/types/common.types';

// ─── Field mapping helpers ──────────────────────────────────────
// Backend Prisma fields → Frontend interface fields

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(raw: any): Product {
  return {
    ...raw,
    price: raw.basePrice ?? raw.price,
    compareAtPrice: raw.salePrice ?? raw.compareAtPrice,
    averageRating: raw.avgRating ?? raw.averageRating ?? 0,
    shortDescription: raw.shortDesc ?? raw.shortDescription,
    sku: raw.stockKeepingUnit ?? raw.sku ?? '',
    images: (raw.images ?? []).map((img: any, i: number): ProductImage => ({
      id: img.id ?? `img-${i}`,
      url: img.url,
      alt: img.alt ?? raw.name,
      isPrimary: img.isPrimary ?? i === 0,
      sortOrder: img.sortOrder ?? i,
    })),
    variants: (raw.variants ?? []).map((v: any): ProductVariant => ({
      ...v,
      sku: v.stockKeepingUnit ?? v.sku ?? '',
    })),
  };
}

function mapProducts(rawList: any[]): Product[] {
  return rawList.map(mapProduct);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Product Service ────────────────────────────────────────────

export const productService = {
  // Get paginated products with filters
  getProducts: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const res = await api.get<{ success: boolean; data: Product[]; pagination: PaginatedResponse<Product>['pagination'] }>(
      '/products',
      filters as Record<string, unknown>,
    );
    return { data: mapProducts(res.data), pagination: res.pagination };
  },

  // Get single product by slug
  getProductBySlug: async (slug: string): Promise<Product | null> => {
    const res = await api.get<ApiResponse<Product>>(`/products/${slug}`);
    return res.data ? mapProduct(res.data) : null;
  },

  // Get single product by ID
  getProductById: async (id: string): Promise<Product | null> => {
    const res = await api.get<ApiResponse<Product>>(`/products/id/${id}`);
    return res.data ? mapProduct(res.data) : null;
  },

  // Get featured products
  getFeaturedProducts: async (limit = 8): Promise<Product[]> => {
    const res = await api.get<ApiResponse<Product[]>>('/products/featured', { limit });
    return mapProducts(res.data);
  },

  // Get related products
  getRelatedProducts: async (productId: string, limit = 8): Promise<Product[]> => {
    const res = await api.get<ApiResponse<Product[]>>(`/products/${productId}/related`, { limit });
    return mapProducts(res.data);
  },

  // Search products
  searchProducts: async (query: string, limit = 10): Promise<Product[]> => {
    const res = await api.get<ApiResponse<Product[]>>('/products/search', { q: query, limit });
    return mapProducts(res.data);
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
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories');
    return res.data;
  },

  // Get category tree (hierarchical)
  getCategoryTree: async (): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories/tree');
    return res.data;
  },

  // Get featured categories for homepage
  getFeaturedCategories: async (limit = 6): Promise<Category[]> => {
    const res = await api.get<ApiResponse<Category[]>>('/categories/featured', { limit });
    return res.data;
  },

  // Get single category by slug with products
  getCategoryBySlug: async (slug: string, filters?: ProductFilters) => {
    const res = await api.get<ApiResponse<{ category: Category; products: PaginatedResponse<Product> }>>(
      `/categories/${slug}`,
      filters as Record<string, unknown>,
    );
    // Map products in the nested response
    if (res.data?.products?.data) {
      res.data.products.data = mapProducts(res.data.products.data);
    }
    return res.data;
  },

  // Get category by ID
  getCategoryById: async (id: string): Promise<Category | null> => {
    const res = await api.get<ApiResponse<Category>>(`/categories/id/${id}`);
    return res.data ?? null;
  },
};
