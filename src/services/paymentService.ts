import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { VerifyPaymentResult } from '@/types/order.types';

// ─── Payment service (mock provider) ────────────────────────────
export const paymentService = {
  /**
   * Verify a payment after mock confirm/decline.
   * Called with the transactionRef.
   */
  verifyPayment: (transactionRef: string) =>
    api.get<ApiResponse<VerifyPaymentResult>>(
      `/payments/verify/${encodeURIComponent(transactionRef)}`,
    ),

  /**
   * Send a webhook action (confirm or decline) for a checkout session.
   * Used by the MockPayment page.
   */
  sendWebhook: (checkoutSessionId: string, action: 'confirm' | 'decline') =>
    api.post<ApiResponse<{ status: string }>>('/payments/webhook', {
      checkoutSessionId,
      action,
    }),
};
