import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Cart, CartItem, AddToCartRequest } from '@/types/cart.types';
import { mockCartApi } from '@/services/mockCartApi';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

interface CartActions {
  fetchCart: () => Promise<void>;
  addToCart: (data: AddToCartRequest) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  clearLocalCart: () => void;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  getItemCount: () => number;
  getSubtotal: () => number;
  isInCart: (productId: string, variantId?: string) => CartItem | undefined;
}

const initialState: CartState = {
  cart: null,
  isLoading: false,
  isUpdating: false,
  error: null,
};

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await mockCartApi.getCart();
          set({ cart: response.data, isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: (error as { message: string }).message || 'Failed to fetch cart'
          });
        }
      },

      addToCart: async (data: AddToCartRequest) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await mockCartApi.addToCart(data);
          set({ cart: response.data, isUpdating: false });
        } catch (error) {
          set({ 
            isUpdating: false, 
            error: (error as { message: string }).message || 'Failed to add item to cart'
          });
          throw error;
        }
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        set({ isUpdating: true, error: null });
        
        // Optimistic update
        const currentCart = get().cart;
        if (currentCart) {
          const updatedItems = currentCart.items.map((item: CartItem) => 
            item.id === itemId 
              ? { ...item, quantity, totalPrice: item.price * quantity }
              : item
          );
          const subtotal = updatedItems.reduce((sum: number, item: CartItem) => sum + item.totalPrice, 0);
          set({ 
            cart: { 
              ...currentCart, 
              items: updatedItems,
              subtotal,
              total: subtotal + currentCart.shipping - currentCart.discount + currentCart.tax,
              itemCount: updatedItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
            } 
          });
        }

        try {
          const response = await mockCartApi.updateCartItem(itemId, { quantity });
          set({ cart: response.data, isUpdating: false });
        } catch (error) {
          // Revert on error
          set({ cart: currentCart, isUpdating: false });
          throw error;
        }
      },

      removeItem: async (itemId: string) => {
        set({ isUpdating: true, error: null });
        
        // Optimistic update
        const currentCart = get().cart;
        if (currentCart) {
          const updatedItems = currentCart.items.filter((item: CartItem) => item.id !== itemId);
          const subtotal = updatedItems.reduce((sum: number, item: CartItem) => sum + item.totalPrice, 0);
          set({ 
            cart: { 
              ...currentCart, 
              items: updatedItems,
              subtotal,
              total: subtotal + currentCart.shipping - currentCart.discount + currentCart.tax,
              itemCount: updatedItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0),
            } 
          });
        }

        try {
          const response = await mockCartApi.removeCartItem(itemId);
          set({ cart: response.data, isUpdating: false });
        } catch (error) {
          // Revert on error
          set({ cart: currentCart, isUpdating: false });
          throw error;
        }
      },

      clearCart: async () => {
        set({ isUpdating: true, error: null });
        try {
          await mockCartApi.clearCart();
          set({ cart: null, isUpdating: false });
        } catch (error) {
          set({ 
            isUpdating: false, 
            error: (error as { message: string }).message || 'Failed to clear cart'
          });
          throw error;
        }
      },

      clearLocalCart: () => {
        set({ cart: null, isLoading: false, isUpdating: false, error: null });
      },

      applyCoupon: async (code: string) => {
        set({ isUpdating: true, error: null });
        try {
          const response = await mockCartApi.applyCoupon(code);
          set({ cart: response.data, isUpdating: false });
        } catch (error) {
          set({ 
            isUpdating: false, 
            error: (error as { message: string }).message || 'Invalid coupon code'
          });
          throw error;
        }
      },

      removeCoupon: async () => {
        set({ isUpdating: true, error: null });
        try {
          const response = await mockCartApi.removeCoupon();
          set({ cart: response.data, isUpdating: false });
        } catch (error) {
          set({ isUpdating: false });
          throw error;
        }
      },

      getItemCount: () => {
        const cart = get().cart;
        return cart?.itemCount ?? 0;
      },

      getSubtotal: () => {
        const cart = get().cart;
        return cart?.subtotal ?? 0;
      },

      isInCart: (productId: string, variantId?: string) => {
        const cart = get().cart;
        if (!cart) return undefined;
        
        return cart.items.find((item: CartItem) => 
          item.productId === productId && 
          (variantId ? item.variantId === variantId : true)
        );
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
