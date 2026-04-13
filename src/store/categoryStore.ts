import { create } from 'zustand';
import { categoryService } from '@/services/productService';
import type { Category } from '@/types/product.types';

interface CategoryState {
    categories: Category[];
    isLoading: boolean;
    hasFetched: boolean;
    error: string | null;
    fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
    categories: [],
    isLoading: false,
    hasFetched: false,
    error: null,

    fetchCategories: async () => {
        // Don't re-fetch if we already have data
        if (get().hasFetched || get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
            const categories = await categoryService.getCategories();
            set({ categories, hasFetched: true });
        } catch (err) {
            const message = (err as { message?: string })?.message || 'Failed to load categories';
            console.error('Failed to fetch categories:', err);
            set({ error: message });
        } finally {
            set({ isLoading: false });
        }
    },
}));
