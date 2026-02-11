export type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productImage?: string | null;
  sku?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    images: unknown;
  };
  variant?: {
    id: string;
    name: string;
  } | null;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress?: ShippingAddress | null;
  billingAddress?: ShippingAddress | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string | null;
  notes?: string | null;
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface CreateOrderRequest {
  shippingAddress?: ShippingAddress;
  billingAddress?: ShippingAddress;
  notes?: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface ShippingRate {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays: number;
}
