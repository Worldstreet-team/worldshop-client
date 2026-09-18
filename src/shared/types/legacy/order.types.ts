export type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKAGED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
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
  shippingMethodName?: string | null;
  deliveryPartnerName?: string | null;
  expectedDeliveryDate?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
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

export interface ShippingMethodSummary {
  id: string;
  name: string;
  partnerName: string;
  price: number;
  freeAbove: number | null;
  minDays: number;
  maxDays: number;
  expectedDeliveryDate: string;
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
  shippingMethod: ShippingMethodSummary | null;
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
  shippingMethodId?: string;
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
  action: { type: 'redirect'; url: string } | { type: 'display'; instructions: string };
  redirectUrl?: string;
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
