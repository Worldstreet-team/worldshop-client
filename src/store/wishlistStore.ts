import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Wishlist, WishlistItem } from '@/types/user.types';
import { wishlistService } from '@/services/userService';

interface WishlistState {
  wishlist: Wishlist | null;
  isLoading: boolean;
  error: string | null;
}

interface WishlistActions {
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getItemCount: () => number;
}

const initialState: WishlistState = {
  wishlist: null,
  isLoading: false,
  error: null,
};

export const useWishlistStore = create<WishlistState & WishlistActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchWishlist: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await wishlistService.getWishlist();
          const body = response.data as unknown as { success: boolean; wishlist: Wishlist };
          set({ wishlist: body.wishlist, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: (error as { message: string }).message || 'Failed to fetch wishlist'
          });
        }
      },

      addToWishlist: async (productId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await wishlistService.addToWishlist(productId);
          const body = response.data as unknown as { success: boolean; wishlist: Wishlist };
          set({ wishlist: body.wishlist, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: (error as { message: string }).message || 'Failed to add to wishlist'
          });
          throw error;
        }
      },

      removeFromWishlist: async (productId: string) => {
        const currentWishlist = get().wishlist;

        // Optimistic update
        if (currentWishlist) {
          set({
            wishlist: {
              ...currentWishlist,
              items: currentWishlist.items.filter((item: WishlistItem) => item.productId !== productId),
            },
          });
        }

        try {
          const response = await wishlistService.removeFromWishlist(productId);
          const body = response.data as unknown as { success: boolean; wishlist: Wishlist };
          set({ wishlist: body.wishlist });
        } catch (error) {
          // Revert on error
          set({ wishlist: currentWishlist });
          throw error;
        }
      },

      isInWishlist: (productId: string) => {
        const wishlist = get().wishlist;
        if (!wishlist) return false;
        return wishlist.items.some((item: WishlistItem) => item.productId === productId);
      },

      clearWishlist: () => {
        set(initialState);
      },

      getItemCount: () => {
        const wishlist = get().wishlist;
        return wishlist?.items.length ?? 0;
      },
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ wishlist: state.wishlist }),
    }
  )
);
