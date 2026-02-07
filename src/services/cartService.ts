import { api } from './api';
import type { 
  Cart, 
  AddToCartRequest, 
  UpdateCartItemRequest 
} from '@/types/cart.types';
import type { ApiResponse } from '@/types/common.types';

export const cartService = {
  // Get cart (works for both guests and authenticated users)
  getCart: () => 
    api.get<ApiResponse<Cart>>('/cart'),
  
  // Add item to cart
  addToCart: (data: AddToCartRequest) => 
    api.post<ApiResponse<Cart>>('/cart/items', data),
  
  // Update cart item quantity
  updateCartItem: (itemId: string, data: UpdateCartItemRequest) => 
    api.patch<ApiResponse<Cart>>(`/cart/items/${itemId}`, data),
  
  // Remove item from cart
  removeCartItem: (itemId: string) => 
    api.delete<ApiResponse<Cart>>(`/cart/items/${itemId}`),
  
  // Clear entire cart
  clearCart: () => 
    api.delete<ApiResponse<{ message: string }>>('/cart'),
  
  // Merge guest cart to user cart (after login)
  mergeCart: (sessionId: string) => 
    api.post<ApiResponse<Cart>>('/cart/merge', { sessionId }),
  
  // Apply coupon code
  applyCoupon: (code: string) => 
    api.post<ApiResponse<Cart>>('/cart/coupon', { code }),
  
  // Remove coupon
  removeCoupon: () => 
    api.delete<ApiResponse<Cart>>('/cart/coupon'),
};
