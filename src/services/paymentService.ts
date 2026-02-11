import { api } from './api';
import type { ApiResponse } from '@/types/common.types';

// ─── Response types ─────────────────────────────────────────────
export interface InitializePaymentData {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
}

export interface VerifyPaymentData {
    status: string;         // "success", "failed", "abandoned"
    reference: string;
    amount: number;         // in NGN
    channel: string;
    paidAt: string;
    order: {
        id: string;
        orderNumber: string;
        status: string;
    };
    hasDigitalProducts?: boolean;
}

// ─── Payment service ────────────────────────────────────────────
export const paymentService = {
    /**
     * Initialize a Paystack payment for an order.
     * Returns the authorization URL to redirect the user to.
     */
    initializePayment: (orderId: string) =>
        api.post<ApiResponse<InitializePaymentData>>('/payments/initialize', { orderId }),

    /**
     * Verify a payment after returning from Paystack.
     * Called with the reference query parameter.
     */
    verifyPayment: (reference: string) =>
        api.get<ApiResponse<VerifyPaymentData>>(`/payments/verify/${encodeURIComponent(reference)}`),
};
