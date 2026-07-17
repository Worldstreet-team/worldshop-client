import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { VerifyPaymentResult } from '@/types/order.types';

export interface WalletCurrencyBalance {
  availableMinor: number;
  lockedMinor: number;
  available: number;
  locked: number;
}

export interface WalletBalanceQuote {
  balance: WalletCurrencyBalance;
  quote: {
    amountNgn: number;
    fxRate: number;
    usdMinor: number;
    usd: number;
    sufficient: boolean;
  } | null;
}

// ─── Payment service ────────────────────────────────────────────
export const paymentService = {
  /**
   * Verify a payment by transactionRef. For wallet payments this is the call
   * that captures the hold — i.e. actually collects the money.
   */
  verifyPayment: (transactionRef: string) =>
    api.get<ApiResponse<VerifyPaymentResult>>(
      `/payments/verify/${encodeURIComponent(transactionRef)}`,
    ),

  /**
   * The buyer's available USD wallet balance; with amountNgn also returns the
   * converted order total and whether the balance covers it.
   */
  getWalletBalance: (amountNgn?: number) =>
    api.get<ApiResponse<WalletBalanceQuote>>(
      `/payments/wallet/balance${amountNgn ? `?amountNgn=${amountNgn}` : ''}`,
    ),

  /**
   * Send a webhook action (confirm or decline) for a checkout session.
   * Used by the MockPayment page.
   */
  sendWebhook: (checkoutSessionId: string, action: 'confirm' | 'decline') =>
      api.post<ApiResponse<{ status: string }>>('/payments/webhook/mock', {
      checkoutSessionId,
      action,
    }),
};
