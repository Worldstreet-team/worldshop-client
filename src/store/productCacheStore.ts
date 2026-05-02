import { create } from 'zustand';
import { productService } from '@/services/productService';
import type { Product, ProductFilters } from '@/types/product.types';
import type { PaginatedResponse } from '@/types/common.types';

const PRODUCT_TTL_MS = 5 * 60 * 1000;
const DETAIL_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

interface ProductCacheState {
  productsBySlug: Record<string, CacheEntry<Product>>;
  productsById: Record<string, CacheEntry<Product>>;
  productLists: Record<string, CacheEntry<PaginatedResponse<Product>>>;
  featuredProducts: CacheEntry<Product[]> | null;
  relatedProducts: Record<string, CacheEntry<Product[]>>;
  searchResults: Record<string, CacheEntry<Product[]>>;
  priceRange: { min: number; max: number; fetchedAt: number } | null;
  loadingKeys: Set<string>;
  pendingRequests: Map<string, Promise<unknown>>;
}

interface ProductCacheActions {
  getProductBySlug: (slug: string) => Promise<Product | null>;
  getProductById: (id: string) => Promise<Product | null>;
  getProducts: (filters?: ProductFilters, forceRefresh?: boolean) => Promise<PaginatedResponse<Product>>;
  getFeaturedProducts: (limit?: number, forceRefresh?: boolean) => Promise<Product[]>;
  getRelatedProducts: (productId: string, limit?: number, forceRefresh?: boolean) => Promise<Product[]>;
  searchProducts: (query: string, limit?: number, forceRefresh?: boolean) => Promise<Product[]>;
  getPriceRange: (forceRefresh?: boolean) => Promise<{ min: number; max: number }>;
  seedProducts: (products: Product[]) => void;
  invalidateProduct: (slug: string) => void;
  invalidateAll: () => void;
  isLoading: (key: string) => boolean;
}

function cacheKey(filters?: ProductFilters): string {
  if (!filters) return 'default';
  return JSON.stringify(filters, Object.keys(filters || {}).sort());
}

export { cacheKey };

function pruneRecord<K extends string, T>(record: Record<K, CacheEntry<T>>, maxEntries: number): Record<K, CacheEntry<T>> {
  const entries = Object.entries(record) as [K, CacheEntry<T>][];
  if (entries.length <= maxEntries) return record;
  const sorted = entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
  return Object.fromEntries(sorted.slice(-maxEntries)) as Record<K, CacheEntry<T>>;
}

const initialState: ProductCacheState = {
  productsBySlug: {},
  productsById: {},
  productLists: {},
  featuredProducts: null,
  relatedProducts: {},
  searchResults: {},
  priceRange: null,
  loadingKeys: new Set(),
  pendingRequests: new Map(),
};

export const useProductCacheStore = create<ProductCacheState & ProductCacheActions>()(
  (set, get) => ({
    ...initialState,

    isLoading: (key: string) => get().loadingKeys.has(key),

    seedProducts: (products: Product[]) => {
      const state = get();
      const slugs: Record<string, CacheEntry<Product>> = {};
      const ids: Record<string, CacheEntry<Product>> = {};
      const now = Date.now();
      for (const p of products) {
        slugs[p.slug] = { data: p, fetchedAt: now };
        ids[p.id] = { data: p, fetchedAt: now };
      }
      set({
        productsBySlug: pruneRecord({ ...state.productsBySlug, ...slugs }, MAX_CACHE_ENTRIES),
        productsById: pruneRecord({ ...state.productsById, ...ids }, MAX_CACHE_ENTRIES),
      });
    },

    getProductBySlug: async (slug: string) => {
      const cached = get().productsBySlug[slug];
      if (cached && Date.now() - cached.fetchedAt < DETAIL_TTL_MS) return cached.data;

      const requestKey = `slug:${slug}`;
      const pending = get().pendingRequests.get(requestKey);
      if (pending) return pending as Promise<Product | null>;

      const promise = (async () => {
        const product = await productService.getProductBySlug(slug);
        if (product) {
          set((s) => ({
            productsBySlug: pruneRecord({ ...s.productsBySlug, [slug]: { data: product, fetchedAt: Date.now() } }, MAX_CACHE_ENTRIES),
            productsById: pruneRecord({ ...s.productsById, [product.id]: { data: product, fetchedAt: Date.now() } }, MAX_CACHE_ENTRIES),
          }));
        }
        return product;
      })();

      set((s) => { s.pendingRequests.set(requestKey, promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete(requestKey); return {}; });
      }
    },

    getProductById: async (id: string) => {
      const cached = get().productsById[id];
      if (cached && Date.now() - cached.fetchedAt < DETAIL_TTL_MS) return cached.data;

      const requestKey = `id:${id}`;
      const pending = get().pendingRequests.get(requestKey);
      if (pending) return pending as Promise<Product | null>;

      const promise = (async () => {
        const product = await productService.getProductById(id);
        if (product) {
          set((s) => ({
            productsById: pruneRecord({ ...s.productsById, [id]: { data: product, fetchedAt: Date.now() } }, MAX_CACHE_ENTRIES),
            productsBySlug: pruneRecord({ ...s.productsBySlug, [product.slug]: { data: product, fetchedAt: Date.now() } }, MAX_CACHE_ENTRIES),
          }));
        }
        return product;
      })();

      set((s) => { s.pendingRequests.set(requestKey, promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete(requestKey); return {}; });
      }
    },

    getProducts: async (filters?: ProductFilters, forceRefresh = false) => {
      const key = cacheKey(filters);
      const cached = get().productLists[key];

      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < PRODUCT_TTL_MS) {
        return cached.data;
      }

      const pending = get().pendingRequests.get(`list:${key}`);
      if (pending) return pending as Promise<PaginatedResponse<Product>>;

      const promise = (async () => {
        set((s) => { s.loadingKeys.add(key); return {}; });
        try {
          const result = await productService.getProducts(filters);

          set((s) => ({
            productLists: { ...s.productLists, [key]: { data: result, fetchedAt: Date.now() } },
          }));

          get().seedProducts(result.data);

          return result;
        } finally {
          set((s) => { s.loadingKeys.delete(key); return {}; });
        }
      })();

      set((s) => { s.pendingRequests.set(`list:${key}`, promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete(`list:${key}`); return {}; });
      }
    },

    getFeaturedProducts: async (limit = 8, forceRefresh = false) => {
      const cached = get().featuredProducts;
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < PRODUCT_TTL_MS) return cached.data;

      const pending = get().pendingRequests.get('featured');
      if (pending) return pending as Promise<Product[]>;

      const promise = (async () => {
        set((s) => { s.loadingKeys.add('featured'); return {}; });
        try {
          const products = await productService.getFeaturedProducts(limit);
          set({ featuredProducts: { data: products, fetchedAt: Date.now() } });
          get().seedProducts(products);
          return products;
        } finally {
          set((s) => { s.loadingKeys.delete('featured'); return {}; });
        }
      })();

      set((s) => { s.pendingRequests.set('featured', promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete('featured'); return {}; });
      }
    },

    getRelatedProducts: async (productId: string, limit = 8, forceRefresh = false) => {
      const key = `related:${productId}:${limit}`;
      const cached = get().relatedProducts[key];
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < PRODUCT_TTL_MS) return cached.data;

      const pending = get().pendingRequests.get(key);
      if (pending) return pending as Promise<Product[]>;

      const promise = (async () => {
        set((s) => { s.loadingKeys.add(key); return {}; });
        try {
          const products = await productService.getRelatedProducts(productId, limit);
          set((s) => ({
            relatedProducts: { ...s.relatedProducts, [key]: { data: products, fetchedAt: Date.now() } },
          }));
          get().seedProducts(products);
          return products;
        } finally {
          set((s) => { s.loadingKeys.delete(key); return {}; });
        }
      })();

      set((s) => { s.pendingRequests.set(key, promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete(key); return {}; });
      }
    },

    searchProducts: async (query: string, limit = 20, forceRefresh = false) => {
      const key = `search:${query}:${limit}`;
      const cached = get().searchResults[key];
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < PRODUCT_TTL_MS) return cached.data;

      const pending = get().pendingRequests.get(key);
      if (pending) return pending as Promise<Product[]>;

      const promise = (async () => {
        set((s) => { s.loadingKeys.add(key); return {}; });
        try {
          const products = await productService.searchProducts(query, limit);
          set((s) => ({
            searchResults: { ...s.searchResults, [key]: { data: products, fetchedAt: Date.now() } },
          }));
          get().seedProducts(products);
          return products;
        } finally {
          set((s) => { s.loadingKeys.delete(key); return {}; });
        }
      })();

      set((s) => { s.pendingRequests.set(key, promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete(key); return {}; });
      }
    },

    getPriceRange: async (forceRefresh = false) => {
      const cached = get().priceRange;
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < DETAIL_TTL_MS) {
        return { min: cached.min, max: cached.max };
      }

      const pending = get().pendingRequests.get('priceRange');
      if (pending) return pending as Promise<{ min: number; max: number }>;

      const promise = (async () => {
        const range = await productService.getPriceRange();
        set({ priceRange: { ...range, fetchedAt: Date.now() } });
        return range;
      })();

      set((s) => { s.pendingRequests.set('priceRange', promise); return {}; });
      try {
        return await promise;
      } finally {
        set((s) => { s.pendingRequests.delete('priceRange'); return {}; });
      }
    },

    invalidateProduct: (slug: string) => {
      set((s) => {
        const { [slug]: _, ...restSlugs } = s.productsBySlug;
        return { productsBySlug: restSlugs };
      });
    },

    invalidateAll: () => set({
      ...initialState,
      loadingKeys: new Set(),
      pendingRequests: new Map(),
    }),
  }),
);
