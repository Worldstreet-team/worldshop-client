/**
 * Mock API Service
 * Simulates API calls with realistic delays
 */

import mockData from '@/data/mockData.json';
import type { Product, Category, Review } from '@/types/product.types';

// Simulate network delay
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay between min and max
const randomDelay = (min: number = 300, max: number = 800) =>
  delay(Math.floor(Math.random() * (max - min + 1)) + min);

type LegacyProduct = Product & {
  price?: number;
  compareAtPrice?: number;
  averageRating?: number;
};

const getProductPrice = (product: LegacyProduct) =>
  product.salePrice ?? product.basePrice ?? product.price ?? 0;

const getProductRating = (product: LegacyProduct) =>
  product.avgRating ?? product.averageRating ?? 0;

/**
 * Category API
 */
export const categoryApi = {
  /**
   * Get all categories
   */
  async getAll(): Promise<Category[]> {
    await randomDelay();
    return mockData.categories as unknown as Category[];
  },

  /**
   * Get category by slug
   */
  async getBySlug(slug: string): Promise<Category | null> {
    await randomDelay();
    const category = mockData.categories.find(c => c.slug === slug);
    return (category as unknown as Category) || null;
  },

  /**
   * Get featured categories
   */
  async getFeatured(): Promise<Category[]> {
    await randomDelay();
    return mockData.featuredCategories as Category[];
  },
};

/**
 * Product API
 */
export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  search?: string;
  inStock?: boolean;
  sortBy?: 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'rating' | 'newest';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const productApi = {
  /**
   * Get all products with optional filters and pagination
   */
  async getAll(
    filters: ProductFilters = {},
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedResponse<Product>> {
    await randomDelay(400, 1000);

    let products = [...mockData.products] as unknown as LegacyProduct[];

    // Apply filters
    if (filters.categoryId) {
      products = products.filter(p => p.categoryId === filters.categoryId);
    }

    if (filters.minPrice !== undefined) {
      products = products.filter(p => getProductPrice(p) >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      products = products.filter(p => getProductPrice(p) <= filters.maxPrice!);
    }

    if (filters.brand) {
      products = products.filter(p => p.brand === filters.brand);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(
        p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags?.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    if (filters.inStock) {
      products = products.filter(p => p.stock > 0);
    }

    // Apply sorting
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price-asc':
          products.sort((a, b) => getProductPrice(a) - getProductPrice(b));
          break;
        case 'price-desc':
          products.sort((a, b) => getProductPrice(b) - getProductPrice(a));
          break;
        case 'name-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-desc':
          products.sort((a, b) => b.name.localeCompare(a.name));
          break;
        case 'rating':
          products.sort((a, b) => getProductRating(b) - getProductRating(a));
          break;
        case 'newest':
          products.sort((a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
          );
          break;
      }
    }

    // Paginate
    const total = products.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedProducts = products.slice(startIndex, startIndex + pageSize);

    return {
      data: paginatedProducts,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Get product by ID
   */
  async getById(id: string): Promise<Product | null> {
    await randomDelay();
    const product = mockData.products.find(p => p.id === id);
    return (product as unknown as Product) || null;
  },

  /**
   * Get product by slug
   */
  async getBySlug(slug: string): Promise<Product | null> {
    await randomDelay();
    const product = mockData.products.find(p => p.slug === slug);
    return (product as unknown as Product) || null;
  },

  /**
   * Get featured products
   */
  async getFeatured(): Promise<Product[]> {
    await randomDelay();
    return mockData.products.filter(p => p.isFeatured) as unknown as Product[];
  },

  /**
   * Get related products (same category, excluding current)
   */
  async getRelated(productId: string, limit: number = 8): Promise<Product[]> {
    await randomDelay(300, 600);
    const product = mockData.products.find(p => p.id === productId);
    if (!product) return [];

    const related = mockData.products
      .filter(p => p.categoryId === product.categoryId && p.id !== productId)
      .slice(0, limit);

    // If not enough in same category, add from other categories
    if (related.length < limit) {
      const others = mockData.products
        .filter(p => p.id !== productId && !related.find(r => r.id === p.id))
        .slice(0, limit - related.length);
      related.push(...others);
    }

    return related as unknown as Product[];
  },

  /**
   * Search products
   */
  async search(query: string, limit: number = 10): Promise<Product[]> {
    await randomDelay(200, 500);
    const queryLower = query.toLowerCase();

    return mockData.products
      .filter(
        p =>
          p.name.toLowerCase().includes(queryLower) ||
          p.description.toLowerCase().includes(queryLower) ||
          p.brand.toLowerCase().includes(queryLower) ||
          p.tags?.some(t => t.toLowerCase().includes(queryLower))
      )
      .slice(0, limit) as unknown as Product[];
  },

  /**
   * Get price range for filters
   */
  async getPriceRange(): Promise<{ min: number; max: number }> {
    await delay(200);
    return mockData.priceRange;
  },

  /**
   * Get all unique brands
   */
  async getBrands(): Promise<string[]> {
    await delay(200);
    const brands = [...new Set(mockData.products.map(p => p.brand))];
    return brands.sort();
  },
};

/**
 * Review API
 */
export interface ReviewFilters {
  rating?: number;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export const reviewApi = {
  /**
   * Get reviews for a product
   */
  async getByProductId(
    productId: string,
    filters: ReviewFilters = {},
    page: number = 1,
    pageSize: number = 5
  ): Promise<PaginatedResponse<Review>> {
    await randomDelay(300, 700);

    const productReviews = (mockData.reviews as Record<string, Review[]>)[productId] || [];
    let reviews = [...productReviews];

    // Filter by rating
    if (filters.rating) {
      reviews = reviews.filter(r => r.rating === filters.rating);
    }

    // Sort
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          reviews.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
        case 'oldest':
          reviews.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          break;
        case 'highest':
          reviews.sort((a, b) => b.rating - a.rating);
          break;
        case 'lowest':
          reviews.sort((a, b) => a.rating - b.rating);
          break;
      }
    }

    // Paginate
    const total = reviews.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedReviews = reviews.slice(startIndex, startIndex + pageSize);

    return {
      data: paginatedReviews,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Get review summary for a product
   */
  async getSummary(productId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    distribution: { rating: number; count: number; percentage: number }[];
  }> {
    await delay(200);

    const productReviews = (mockData.reviews as Record<string, Review[]>)[productId] || [];
    const total = productReviews.length;

    if (total === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: [5, 4, 3, 2, 1].map(rating => ({
          rating,
          count: 0,
          percentage: 0,
        })),
      };
    }

    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const distribution = [5, 4, 3, 2, 1].map(rating => {
      const count = productReviews.filter(r => r.rating === rating).length;
      return {
        rating,
        count,
        percentage: Math.round((count / total) * 100),
      };
    });

    return {
      averageRating: Math.round(average * 10) / 10,
      totalReviews: total,
      distribution,
    };
  },

  /**
   * Submit a new review
   */
  async create(review: {
    productId: string;
    rating: number;
    title: string;
    comment: string;
  }): Promise<Review> {
    await randomDelay(500, 1000);

    // Simulate created review
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId: review.productId,
      userId: 'current-user',
      userName: 'You',
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return newReview;
  },
};

/**
 * Banner API
 */
export const bannerApi = {
  /**
   * Get active banners for homepage slider
   */
  async getActive(): Promise<typeof mockData.banners> {
    await delay(300);
    return mockData.banners.filter(b => b.isActive);
  },
};

/**
 * Export all APIs
 */
export const api = {
  categories: categoryApi,
  products: productApi,
  reviews: reviewApi,
  banners: bannerApi,
};

export default api;
