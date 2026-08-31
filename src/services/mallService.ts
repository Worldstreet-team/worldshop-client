import apiClient, { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type {
  Listing,
  PublicStore,
  SubscriptionPlan,
  SubscriptionStatus,
  ChargeResult,
  UpdateStorePayload,
  UploadedImage,
} from './storeService';

/**
 * Mall API.
 *
 * A mall is a paid umbrella over substores: any user can create one, then
 * create substores inside it. The mall's single subscription covers every
 * substore, so substores have no billing of their own — their visibility
 * follows the mall's.
 */

export type MallStatus = 'DRAFT' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED' | 'BANNED';

export interface MyMall {
  id: string;
  name: string;
  slug: string;
  status: MallStatus;
  isPubliclyVisible: boolean;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  state?: string;
  city?: string | null;
  address?: string | null;
  featuredListingIds?: string[];
  substoreCount?: number;
  subscription?: {
    status: SubscriptionStatus;
    autoRenew: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
    plan: SubscriptionPlan & { substoreLimit: number | null };
  } | null;
}

export interface CreateMallRequest {
  name: string;
  description?: string;
  state: string;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  planCode?: string;
}

/** Substores are full stores; the owner shape matches MyStore closely. */
export interface Substore {
  id: string;
  name: string;
  slug: string;
  status: string;
  mallId: string | null;
  description?: string | null;
  logo?: string | null;
  banner?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  state?: string;
  city?: string | null;
  address?: string | null;
  listingCount?: number;
}

export interface CreateSubstoreRequest {
  name: string;
  description?: string;
  /** Defaults to the mall's location when omitted. */
  state?: string;
  city?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export interface PublicMall {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  state: string;
  city: string | null;
  address: string | null;
  status: MallStatus;
  substoreCount: number;
  createdAt: string;
}

export interface PublicMallPage extends PublicMall {
  substores: PublicStore[];
  featuredListings: Array<Listing & { store: { id: string; name: string; slug: string } }>;
}

export const mallService = {
  /** GET /malls/plans — public, so the price is shown before signup. */
  getPlans: () => api.get<ApiResponse<Array<SubscriptionPlan & { substoreLimit: number | null }>>>('/malls/plans'),

  /** POST /malls — creates the mall in DRAFT. Nothing is charged here. */
  createMall: (data: CreateMallRequest) => api.post<ApiResponse<MyMall>>('/malls', data),

  /** GET /malls/me — 404 when the signed-in user has no mall yet. */
  getMyMall: () => api.get<ApiResponse<MyMall>>('/malls/me'),

  updateMall: (data: UpdateStorePayload) => api.patch<ApiResponse<MyMall>>('/malls/me', data),

  getSubscription: () => api.get<ApiResponse<unknown>>('/malls/me/subscription'),

  /** Charges the WorldStreet dollar wallet; 402 means insufficient funds. */
  chargeSubscription: () => api.post<ApiResponse<ChargeResult>>('/malls/me/subscription/charge'),

  cancelSubscription: () => api.post<ApiResponse<unknown>>('/malls/me/subscription/cancel'),

  /**
   * Branding upload for the mall and its substores. Mounted on the mall
   * rather than a store, because a mall owner need not have a personal store
   * — the /stores/me rail would 404 for them.
   */
  uploadBranding: (file: File) => {
    const form = new FormData();
    form.append('images', file);
    return apiClient
      .post<ApiResponse<UploadedImage[]>>('/malls/me/upload/images?folder=malls', form)
      .then((res) => res.data);
  },

  /** PUT /malls/me/featured — up to 12 published listings from substores. */
  setFeatured: (listingIds: string[]) =>
    api.put<ApiResponse<{ featuredListingIds: string[] }>>('/malls/me/featured', { listingIds }),

  // ── Substores ─────────────────────────────────────────────────
  listSubstores: () => api.get<ApiResponse<Substore[]>>('/malls/me/substores'),

  createSubstore: (data: CreateSubstoreRequest) =>
    api.post<ApiResponse<Substore>>('/malls/me/substores', data),

  getSubstore: (id: string) => api.get<ApiResponse<Substore>>(`/malls/me/substores/${id}`),

  updateSubstore: (id: string, data: UpdateStorePayload) =>
    api.patch<ApiResponse<Substore>>(`/malls/me/substores/${id}`, data),

  /** Deletes an empty substore; archives (hides) one with history. */
  archiveSubstore: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/malls/me/substores/${id}`),

  /** Reopens an archived substore (takes a plan slot again). */
  restoreSubstore: (id: string) =>
    api.post<ApiResponse<Substore>>(`/malls/me/substores/${id}/restore`),

  /** Every listing across the mall's substores — one call, for the featured picker. */
  listMallListings: (params?: { status?: string }) =>
    api.get<ApiResponse<Array<Listing & { store: { id: string; name: string; slug: string } }>>>(
      '/malls/me/listings',
      params,
    ),
};

export default mallService;

// ─── Public (buyer-facing) ──────────────────────────────────────

export const publicMalls = {
  /** GET /malls — directory of paid-up malls. */
  browse: (params?: Record<string, unknown>) =>
    api.get<{
      success: boolean;
      data: PublicMall[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/malls', params),

  /** GET /malls/:slug — branding + substore grid + featured rail, one call. */
  getMall: (slug: string) => api.get<ApiResponse<PublicMallPage>>(`/malls/${slug}`),
};
