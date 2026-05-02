import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { categoryService } from '@/services/productService';
import type { Category } from '@/types/product.types';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  hasFetched: boolean;
  lastFetched: number | null;
  error: string | null;
}

interface CategoryActions {
  fetchCategories: (force?: boolean) => Promise<void>;
}

const initialState: CategoryState = {
  categories: [],
  isLoading: false,
  hasFetched: false,
  lastFetched: null,
  error: null,
};

export const useCategoryStore = create<CategoryState & CategoryActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchCategories: async (force = false) => {
        const state = get();
        const isFresh = state.lastFetched && (Date.now() - state.lastFetched < CACHE_TTL_MS);

        if (!force && isFresh && state.categories.length > 0) return;
        if (!force && state.isLoading) return;

        // Set categories from persisted state immediately (stale-while-revalidate)
        if (state.categories.length > 0) {
          set({ hasFetched: true });
        }

        set({ isLoading: true, error: null });
        try {
          const categories = await categoryService.getCategories();
          set({
            categories,
            hasFetched: true,
            lastFetched: Date.now(),
          });
        } catch (err) {
          const message = (err as { message?: string })?.message || 'Failed to load categories';
          console.error('Failed to fetch categories:', err);
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'category-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        categories: state.categories,
        lastFetched: state.lastFetched,
        hasFetched: state.hasFetched,
      }),
    },
  ),
);
