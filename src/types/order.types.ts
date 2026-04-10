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
  vendorId?: string | null;
  checkoutSessionId?: string | null;
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

// ─── Checkout Session Types ─────────────────────────────────────

export interface CheckoutIssue {
  productId: string;
  productName: string;
  reason: 'out_of_stock' | 'insufficient_stock' | 'inactive' | 'price_changed';
  detail: string;
}

export interface VendorGroup {
  vendorId: string | null;
  storeName: string;
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string | null;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    image?: string | null;
  }>;
  subtotal: number;
  shipping: number;
  total: number;
}

export interface CheckoutSessionPreview {
  snapshotToken: string;
  vendorGroups: VendorGroup[];
  issues: CheckoutIssue[];
  requiresShipping: boolean;
  summary: {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
    itemCount: number;
  };
}

export interface ConfirmCheckoutSessionInput {
  snapshotToken: string;
  shippingAddress?: ShippingAddress;
  billingAddress?: ShippingAddress;
  notes?: string;
}

export interface CheckoutSessionResult {
  checkoutSessionId: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    vendorId: string | null;
    storeName: string;
    subtotal: number;
    shipping: number;
    total: number;
    itemCount: number;
  }>;
  summary: {
    totalOrders: number;
    grandTotal: number;
  };
}

export interface InitPaymentResult {
  transactionRef: string;
  action: 'redirect' | 'display';
  redirectUrl?: string;
  displayData?: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  status: 'success' | 'failed' | 'pending';
  transactionRef: string;
  amount: number;
  paidAt?: string | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
  }>;
}
