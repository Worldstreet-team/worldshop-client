import { api } from './api';
import type { 
  Order, 
  CreateOrderRequest, 
  ShippingRate 
} from '@/types/order.types';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/common.types';

export const orderService = {
  // Create order (after successful payment)
  createOrder: (data: CreateOrderRequest) => 
    api.post<ApiResponse<Order>>('/orders', data),
  
  // Get user's orders
  getOrders: (params?: PaginationParams) => 
    api.get<PaginatedResponse<Order>>('/orders', params as Record<string, unknown>),
  
  // Get single order by ID
  getOrderById: (id: string) => 
    api.get<ApiResponse<Order>>(`/orders/${id}`),
  
  // Get order by order number
  getOrderByNumber: (orderNumber: string) => 
    api.get<ApiResponse<Order>>(`/orders/number/${orderNumber}`),
  
  // Cancel order (only if status allows)
  cancelOrder: (id: string, reason?: string) => 
    api.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),
  
  // Track order
  trackOrder: (orderNumber: string) => 
    api.get<ApiResponse<{ status: string; history: Array<{ status: string; date: string; note?: string }> }>>(
      `/orders/track/${orderNumber}`
    ),
};

export const checkoutService = {
  // Validate cart for checkout (check stock, prices, etc.)
  validateCart: () => 
    api.post<ApiResponse<{ valid: boolean; issues?: string[] }>>('/checkout/validate'),
  
  // Get shipping rates
  getShippingRates: (addressId: string) => 
    api.get<ApiResponse<ShippingRate[]>>('/shipping/rates', { addressId }),
  
  // Initialize payment (get payment URL from Paystack)
  initializePayment: (data: { orderId: string; callbackUrl: string }) => 
    api.post<ApiResponse<{ authorizationUrl: string; reference: string }>>('/payments/initialize', data),
  
  // Verify payment
  verifyPayment: (reference: string) => 
    api.get<ApiResponse<{ status: 'success' | 'failed'; orderId?: string }>>(`/payments/verify/${reference}`),
};
