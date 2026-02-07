import type { Product, ProductVariant } from './product.types';
import type { Address } from './user.types';

export type OrderStatus = 
  | 'CREATED'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  variantId?: string;
  variant?: ProductVariant;
  productName: string;
  productImage?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  providerRef?: string;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string;
  notes?: string;
  payment?: Payment;
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface CreateOrderRequest {
  shippingAddressId: string;
  billingAddressId?: string;
  shippingMethod: string;
  notes?: string;
}

export interface ShippingRate {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays: number;
}
