import type { Product, ProductVariant } from './product.types';

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}
