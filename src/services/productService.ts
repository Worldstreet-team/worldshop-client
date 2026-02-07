import { api } from './api';
import type { 
  Product, 
  Category, 
  Review, 
  ProductFilters 
} from '@/types/product.types';
import type { ApiResponse, PaginatedResponse } from '@/types/common.types';

export const productService = {
  // Get paginated products with filters
  getProducts: (filters?: ProductFilters) => 
    api.get<PaginatedResponse<Product>>('/products', filters as Record<string, unknown>),
  
  // Get single product by slug
  getProductBySlug: (slug: string) => 
    api.get<ApiResponse<Product>>(`/products/${slug}`),
  
  // Get single product by ID
  getProductById: (id: string) => 
    api.get<ApiResponse<Product>>(`/products/id/${id}`),
  
  // Get featured products
  getFeaturedProducts: (limit = 8) => 
    api.get<ApiResponse<Product[]>>('/products/featured', { limit }),
  
  // Get product reviews
  getProductReviews: (productId: string, page = 1, limit = 10) => 
    api.get<PaginatedResponse<Review>>(`/products/${productId}/reviews`, { page, limit }),
  
  // Add product review (requires auth)
  addProductReview: (productId: string, data: { rating: number; title?: string; comment: string }) => 
    api.post<ApiResponse<Review>>(`/products/${productId}/reviews`, data),
  
  // Get related products
  getRelatedProducts: (productId: string, limit = 4) => 
    api.get<ApiResponse<Product[]>>(`/products/${productId}/related`, { limit }),
  
  // Search products
  searchProducts: (query: string, limit = 10) => 
    api.get<ApiResponse<Product[]>>('/products/search', { q: query, limit }),
};

export const categoryService = {
  // Get all categories
  getCategories: () => 
    api.get<ApiResponse<Category[]>>('/categories'),
  
  // Get category tree (hierarchical)
  getCategoryTree: () => 
    api.get<ApiResponse<Category[]>>('/categories/tree'),
  
  // Get single category by slug with products
  getCategoryBySlug: (slug: string, filters?: ProductFilters) => 
    api.get<ApiResponse<{ category: Category; products: PaginatedResponse<Product> }>>(
      `/categories/${slug}`, 
      filters as Record<string, unknown>
    ),
  
  // Get category by ID
  getCategoryById: (id: string) => 
    api.get<ApiResponse<Category>>(`/categories/id/${id}`),
};
