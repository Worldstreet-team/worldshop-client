import { api } from './api';
import type { ApiResponse } from '@/types/common.types';

/**
 * The WorldStreet dollar wallet, shared across the ecosystem. Shop only reads
 * the balance (for the navbar pill) — funding and withdrawals live in the
 * wallet app at dashboard.worldstreetgold.com.
 */
export interface Wallet {
  currency: string;
  availableMinor: number;
  lockedMinor: number;
}

export const walletService = {
  get: () => api.get<ApiResponse<Wallet>>('/wallet'),
};
