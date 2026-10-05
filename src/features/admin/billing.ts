import { api } from '@/shared/lib/api';
import type { ApiResponse } from '@/shared/types/common.types';
import { billingInterval } from '@/features/stores/model';

/**
 * Subscription plans and revenue, for the admin console. Server side:
 * worldshop-server src/services/admin.billing.service.ts.
 *
 * Every amount is USD minor units (cents), as the plans and charges store it.
 */

export type PlanKind = 'STORE' | 'MALL';

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  kind: PlanKind;
  amountMinor: number;
  currency: string;
  /** Set for calendar-month plans; null means the plan runs on intervalDays. */
  intervalMonths: number | null;
  intervalDays: number;
  graceDays: number;
  /** null = unlimited. */
  listingLimit: number | null;
  /** Mall plans only; null = unlimited. */
  substoreLimit: number | null;
  perks: string[];
  isActive: boolean;
  sortOrder: number;
  /** The plan new signups are put on; it cannot be deactivated. */
  isDefault: boolean;
  subscribers: { active: number; grace: number; pending: number; other: number };
  updatedAt: string;
}

export type AdminPlanInput = Pick<
  AdminPlan,
  | 'name'
  | 'amountMinor'
  | 'intervalMonths'
  | 'intervalDays'
  | 'graceDays'
  | 'listingLimit'
  | 'substoreLimit'
  | 'perks'
  | 'isActive'
  | 'sortOrder'
>;

export type AdminPlanCreateInput = AdminPlanInput & { code: string; kind: PlanKind };

export interface RevenueMonth {
  /** YYYY-MM, UTC. */
  month: string;
  storeMinor: number;
  mallMinor: number;
  walletMinor: number;
  creditMinor: number;
  payments: number;
}

export interface RevenuePayment {
  id: string;
  kind: PlanKind;
  name: string;
  slug: string | null;
  plan: string;
  amountMinor: number;
  walletMinor: number;
  creditMinor: number;
  status: 'PAID' | 'FAILED';
  failureCode: string | null;
  attempts: number;
  periodStart: string;
  periodEnd: string;
  at: string;
}

export interface AdminRevenue {
  currency: string;
  totals: {
    allTimeMinor: number;
    /** The part paid from vendor wallets: new money. */
    allTimeWalletMinor: number;
    /** The part paid from store credit the platform already owed. */
    allTimeCreditMinor: number;
    allTimePayments: number;
    thisMonthMinor: number;
    lastMonthMinor: number;
    /** Monthly value of every subscription that will be charged again. */
    monthlyRecurringMinor: number;
    failedLast30Days: number;
  };
  subscriptions: {
    stores: Record<string, number>;
    malls: Record<string, number>;
  };
  series: RevenueMonth[];
  recent: RevenuePayment[];
}

export const adminBillingService = {
  getPlans: async (): Promise<AdminPlan[]> => {
    const res = await api.get<ApiResponse<AdminPlan[]>>('/admin/billing/plans');
    return res.data;
  },

  createPlan: async (input: AdminPlanCreateInput): Promise<AdminPlan> => {
    const res = await api.post<ApiResponse<AdminPlan>>('/admin/billing/plans', input);
    return res.data;
  },

  updatePlan: async (id: string, input: Partial<AdminPlanInput>): Promise<AdminPlan> => {
    const res = await api.patch<ApiResponse<AdminPlan>>(`/admin/billing/plans/${id}`, input);
    return res.data;
  },

  getRevenue: async (months = 12): Promise<AdminRevenue> => {
    const res = await api.get<ApiResponse<AdminRevenue>>('/admin/billing/revenue', { months });
    return res.data;
  },
};

/** $1,234.50, from cents. Whole dollars drop the cents. */
export function usd(minor: number): string {
  const dollars = minor / 100;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "a month", "every 3 months": the same wording vendors see. */
export const intervalLabel = billingInterval;
