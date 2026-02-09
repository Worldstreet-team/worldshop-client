import { api } from './api';
import type {
  Order,
  CreateOrderRequest,
} from '@/types/order.types';
import type { ApiResponse, PaginationParams } from '@/types/common.types';

/**
 * Backend paginated response shape for orders.
 * Matches the backend's { success, data, pagination } contract.
 */
export interface OrdersPaginatedResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const orderService = {
  // Create order from cart
  createOrder: (data: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>('/orders', data),

  // Get user's orders (paginated)
  getOrders: (params?: PaginationParams & { status?: string }) =>
    api.get<OrdersPaginatedResponse>('/orders', params as Record<string, unknown>),

  // Get single order by ID
  getOrderById: (id: string) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`),

  // Get order by order number
  getOrderByNumber: (orderNumber: string) =>
    api.get<ApiResponse<Order>>(`/orders/number/${orderNumber}`),

  // Cancel order (only CREATED status)
  cancelOrder: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),
};

export const checkoutService = {
  // Validate cart for checkout (check stock, prices, etc.)
  validateCart: () =>
    api.post<ApiResponse<{ valid: boolean; issues?: string[] }>>('/checkout/validate'),
};
