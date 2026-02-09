/**
 * Mock Cart API Service
 * Simulates cart operations with localStorage persistence
 */

import mockData from '@/data/mockData.json';
import type { Cart, CartItem, AddToCartRequest, UpdateCartItemRequest } from '@/types/cart.types';
import type { Product } from '@/types/product.types';

// Storage key
const CART_STORAGE_KEY = 'worldshop_cart';

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Generate unique ID
const generateId = () => `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get cart ID (session-based)
const getCartId = () => {
  let cartId = localStorage.getItem('cartId');
  if (!cartId) {
    cartId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('cartId', cartId);
  }
  return cartId;
};

// Get products from mock data
const getProductById = (productId: string): Product | undefined => {
  return (mockData.products as unknown as Product[]).find(p => p.id === productId);
};

// Calculate cart totals
const calculateTotals = (items: CartItem[]): Partial<Cart> => {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Simple tax calculation (8%)
  const tax = subtotal * 0.08;

  // Free shipping over $50
  const shipping = subtotal >= 50 ? 0 : 5.99;

  const total = subtotal + tax + shipping;

  return {
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
    discount: 0,
  };
};

// Get cart from localStorage
const getStoredCart = (): Cart => {
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid JSON, create new cart
    }
  }

  // Create new empty cart
  const cartId = getCartId();
  const now = new Date().toISOString();
  return {
    id: cartId,
    sessionId: localStorage.getItem('sessionId') || undefined,
    items: [],
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
  };
};

// Save cart to localStorage
const saveCart = (cart: Cart): void => {
  cart.updatedAt = new Date().toISOString();
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
};

/**
 * Mock Cart API
 */
export const mockCartApi = {
  /**
   * Get cart
   */
  async getCart(): Promise<{ data: Cart }> {
    await delay(200);
    const cart = getStoredCart();
    return { data: cart };
  },

  /**
   * Add item to cart
   */
  async addToCart(request: AddToCartRequest): Promise<{ data: Cart }> {
    await delay(300);

    const cart = getStoredCart();
    const product = getProductById(request.productId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Check stock
    if (product.stock < request.quantity) {
      throw new Error('Insufficient stock');
    }

    // Get variant if specified
    const variant = request.variantId
      ? product.variants?.find(v => v.id === request.variantId)
      : undefined;

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(item =>
      item.productId === request.productId &&
      item.variantId === request.variantId
    );

    const price = variant?.price ?? product.salePrice ?? product.basePrice;
    const now = new Date().toISOString();

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const existingItem = cart.items[existingItemIndex];
      const newQuantity = existingItem.quantity + request.quantity;

      // Check stock for new quantity
      const stockLimit = variant?.stock ?? product.stock;
      if (newQuantity > stockLimit) {
        throw new Error('Insufficient stock');
      }

      cart.items[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        totalPrice: Math.round(price * newQuantity * 100) / 100,
        updatedAt: now,
      };
    } else {
      // Add new item
      const newItem: CartItem = {
        id: generateId(),
        cartId: cart.id,
        productId: request.productId,
        product,
        variantId: request.variantId,
        variant,
        quantity: request.quantity,
        price,
        totalPrice: Math.round(price * request.quantity * 100) / 100,
        createdAt: now,
        updatedAt: now,
      };

      cart.items.push(newItem);
    }

    // Recalculate totals
    const totals = calculateTotals(cart.items);
    Object.assign(cart, totals);

    saveCart(cart);
    return { data: cart };
  },

  /**
   * Update cart item quantity
   */
  async updateCartItem(itemId: string, request: UpdateCartItemRequest): Promise<{ data: Cart }> {
    await delay(250);

    const cart = getStoredCart();
    const itemIndex = cart.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      throw new Error('Cart item not found');
    }

    const item = cart.items[itemIndex];
    const product = getProductById(item.productId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Check stock
    const stockLimit = item.variant?.stock ?? product.stock;
    if (request.quantity > stockLimit) {
      throw new Error('Insufficient stock');
    }

    if (request.quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      const now = new Date().toISOString();
      cart.items[itemIndex] = {
        ...item,
        quantity: request.quantity,
        totalPrice: Math.round(item.price * request.quantity * 100) / 100,
        updatedAt: now,
      };
    }

    // Recalculate totals
    const totals = calculateTotals(cart.items);
    Object.assign(cart, totals);

    saveCart(cart);
    return { data: cart };
  },

  /**
   * Remove item from cart
   */
  async removeCartItem(itemId: string): Promise<{ data: Cart }> {
    await delay(200);

    const cart = getStoredCart();
    const itemIndex = cart.items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      throw new Error('Cart item not found');
    }

    cart.items.splice(itemIndex, 1);

    // Recalculate totals
    const totals = calculateTotals(cart.items);
    Object.assign(cart, totals);

    saveCart(cart);
    return { data: cart };
  },

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<{ data: { message: string } }> {
    await delay(200);

    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem('cartId');

    return { data: { message: 'Cart cleared successfully' } };
  },

  /**
   * Apply coupon code
   */
  async applyCoupon(code: string): Promise<{ data: Cart }> {
    await delay(300);

    const cart = getStoredCart();

    // Mock coupon validation
    const validCoupons: Record<string, number> = {
      'SAVE10': 0.10,
      'SAVE20': 0.20,
      'WELCOME': 0.15,
    };

    const discount = validCoupons[code.toUpperCase()];

    if (!discount) {
      throw new Error('Invalid coupon code');
    }

    cart.couponCode = code.toUpperCase();
    cart.discount = Math.round(cart.subtotal * discount * 100) / 100;
    const tax = cart.tax ?? 0;
    cart.total = Math.round((cart.subtotal + tax + cart.shipping - cart.discount) * 100) / 100;

    saveCart(cart);
    return { data: cart };
  },

  /**
   * Remove coupon code
   */
  async removeCoupon(): Promise<{ data: Cart }> {
    await delay(200);

    const cart = getStoredCart();

    cart.couponCode = undefined;
    cart.discount = 0;
    const tax = cart.tax ?? 0;
    cart.total = Math.round((cart.subtotal + tax + cart.shipping) * 100) / 100;

    saveCart(cart);
    return { data: cart };
  },
};

export default mockCartApi;
