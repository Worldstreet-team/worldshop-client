import { create } from 'zustand';
import { categoryService } from '@/services/productService';
import type { Category } from '@/types/product.types';

interface CategoryState {
    categories: Category[];
    isLoading: boolean;
    hasFetched: boolean;
    fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    isLoading: false,
    hasFetched: false,

    fetchCategories: async () => {
        // Don't re-fetch if we already have data
        if (get().hasFetched || get().isLoading) return;

        set({ isLoading: true });
        try {
            const categories = await categoryService.getCategories();
            set({ categories, hasFetched: true });
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            set({ isLoading: false });
        }
    },
}));
