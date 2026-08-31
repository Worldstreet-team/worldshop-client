import apiClient, { api } from './api';
import type { ApiResponse } from '@/types/common.types';

/**
 * Marketplace store API.
 *
 * Replaces the parts of `vendorService` built for the ecommerce model. A store
 * is the new vendor identity: owning one is what makes someone a seller, and
 * paying for it is what makes the store visible to buyers.
 */

export type StoreStatus = 'DRAFT' | 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'SUSPENDED' | 'BANNED';
export type SubscriptionStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'GRACE'
  | 'LAPSED'
  | 'CANCELLED';

export interface DashboardAlert {
  type:
    | 'ACTIVATE' | 'RENEWAL_DUE' | 'PAYMENT_FAILED' | 'EXPIRED'
    | 'UNREAD' | 'DRAFTS' | 'UNREPLIED_REVIEWS' | 'SUSPENDED';
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface VendorDashboard {
  store: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    status: StoreStatus;
    verificationTier: string;
    publiclyVisible: boolean;
    state: string;
    city: string | null;
  };
  subscription: {
    status: SubscriptionStatus;
    autoRenew: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
    daysRemaining: number | null;
    plan: {
      code: string;
      name: string;
      amountMinor: number;
      currency: string;
      intervalMonths: number | null;
      listingLimit: number | null;
    };
    creditMinor: number;
    lastCharge: {
      status: string;
      amountMinor: number;
      currency: string;
      creditMinor: number;
      walletMinor: number;
      chargedAt: string | null;
      failureCode: string | null;
      periodEnd: string;
    } | null;
  } | null;
  /** WorldStreet dollar wallet. null = the wallet service could not be reached. */
  wallet: {
    currency: string;
    availableMinor: number;
    lockedMinor: number;
    /** What the next subscription charge takes from the wallet, after credit. */
    dueMinor: number;
    sufficient: boolean;
  } | null;
  listings: {
    published: number;
    draft: number;
    hidden: number;
    removed: number;
    total: number;
    limit: number | null;
  };
  inbox: { unread: number; openThreads: number };
  engagement: {
    /** Start of the window the counts describe — the paid period, or 30 days. */
    since: string;
    inquiriesThisPeriod: number;
    inquiriesAllTime: number;
    views: number;
    responseRate: number | null;
    avgResponseMins: number | null;
  };
  reputation: { avgRating: number; reviewCount: number; unrepliedReviews: number };
  alerts: DashboardAlert[];
}

export interface MyStore {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  isPubliclyVisible: boolean;
  // Present on GET /stores/me; optional so list-shaped consumers stay valid.
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
}

/** PATCH /stores/me. null clears a field; omitting it keeps the current value. */
export interface UpdateStorePayload {
  name?: string;
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
  regenerateSlug?: boolean;
}

export interface ChargeResult {
  periodEnd: string;
  alreadyPaid: boolean;
}

export interface CreateStoreRequest {
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

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  amountMinor: number;
  currency: string;
  intervalMonths: number | null;
  intervalDays: number;
  listingLimit: number | null;
  perks: string[];
}

// ─── Listings ───────────────────────────────────────────────────

export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
export type PriceType = 'FIXED' | 'RANGE' | 'ON_REQUEST';

/** A vendor-invented spec row. Shown on the listing, never used as a filter. */
export interface CustomField {
  label: string;
  value: string;
}

export interface ListingVariant {
  id?: string;
  name: string;
  attributes: Record<string, string>;
  price?: number;
  isAvailable?: boolean;
  images?: Array<Record<string, unknown>>;
}

export interface Listing {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
  priceType: PriceType;
  basePrice: number | null;
  maxPrice: number | null;
  isNegotiable: boolean;
  condition: string | null;
  brand: string | null;
  material: string | null;
  tags: string[];
  images: Array<Record<string, unknown>>;
  /** Admin-defined, controlled vocabulary — these drive buyer filters. */
  attributes: Record<string, string> | null;
  /** Vendor-defined, free text — display only. */
  customFields: CustomField[];
  variants: ListingVariant[];
  status: ListingStatus;
  publishedAt: string | null;
  state: string | null;
  city: string | null;
  viewCount: number;
  inquiryCount: number;
  updatedAt: string;
  /**
   * Present on vendor-scoped responses only. `problems` is every gate that
   * would reject a publish, worded exactly as the publish endpoint words it.
   */
  compliance?: ListingCompliance;
}

export interface ListingCompliance {
  compliant: boolean;
  problems: string[];
}

export interface ListingFilters {
  page?: number;
  limit?: number;
  status?: ListingStatus;
  categoryId?: string;
  search?: string;
}

export interface ListingPayload {
  name: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  priceType: PriceType;
  basePrice?: number;
  maxPrice?: number;
  isNegotiable: boolean;
  condition?: string;
  brand?: string;
  material?: string;
  tags?: string[];
  images?: Array<Record<string, unknown>>;
  attributes?: Record<string, string>;
  customFields?: CustomField[];
  variants?: ListingVariant[];
  state?: string;
  city?: string;
}

/** What a category requires of a listing — drives the dynamic part of the form. */
export interface CategoryFormSpec {
  categoryId: string;
  attributes: Array<{
    name: string;
    type: 'SELECT' | 'TEXT' | 'NUMBER';
    options: string[];
    isRequired: boolean;
    appliesTo: 'PRODUCT' | 'VARIANT';
    isFilterable: boolean;
    sortOrder: number;
  }>;
  customFieldsAllowed: boolean;
}

export interface PublishResult {
  listing: { id: string; status: ListingStatus; publishedAt: string | null };
  publiclyVisible: boolean;
  message: string;
}

export interface UploadedImage {
  key: string;
  /** Signed URL for immediate display. Optional to tolerate deploy skew. */
  url?: string;
  /** R2 key under the name the read path re-signs from once persisted. */
  cloudflareId?: string;
}

/**
 * Listing management against a configurable base path. The same endpoints
 * exist for a personal store (`/stores/me/listings`) and for each mall
 * substore (`/malls/me/substores/:id/listings`) — the server resolves both to
 * the same controllers — so the vendor product pages can manage either
 * catalogue through this one shape.
 */
export function createListingApi(base: string) {
  return {
    list: (filters?: ListingFilters) =>
      api.get<{ success: boolean; data: Listing[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
        base,
        filters as Record<string, unknown>,
      ),

    get: (id: string) => api.get<ApiResponse<Listing>>(`${base}/${id}`),

    create: (data: ListingPayload) => api.post<ApiResponse<Listing>>(base, data),

    update: (id: string, data: Partial<ListingPayload>) =>
      api.patch<ApiResponse<Listing>>(`${base}/${id}`, data),

    remove: (id: string) => api.delete<ApiResponse<null>>(`${base}/${id}`),

    /**
     * Publishing enforces the category's requirements, so a 400 here is a list
     * of what is missing rather than a failure to surface as "something broke".
     */
    publish: (id: string) => api.post<ApiResponse<PublishResult>>(`${base}/${id}/publish`),

    unpublish: (id: string) =>
      api.post<ApiResponse<{ id: string; status: ListingStatus }>>(`${base}/${id}/unpublish`),

    /** GET form-spec — the attributes this category expects, and their options. */
    getFormSpec: (categoryId: string) =>
      api.get<ApiResponse<CategoryFormSpec>>(`${base}/form-spec`, { categoryId }),

    /** Multipart upload; field name is `images`. */
    uploadImages: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      return apiClient
        .post<ApiResponse<UploadedImage[]>>(`${base}/upload/images`, form)
        .then((res) => res.data);
    },
  };
}

export type ListingApi = ReturnType<typeof createListingApi>;

export const listingService = createListingApi('/stores/me/listings');

export const storeService = {
  /** GET /stores/plans — public, so pricing can be shown before signup. */
  getPlans: () => api.get<ApiResponse<SubscriptionPlan[]>>('/stores/plans'),

  /** POST /stores — creates the store in DRAFT. Nothing is charged here. */
  createStore: (data: CreateStoreRequest) =>
    api.post<ApiResponse<MyStore>>('/stores', data),

  /** GET /stores/me/dashboard — everything the landing page needs, one call. */
  getDashboard: () => api.get<ApiResponse<VendorDashboard>>('/stores/me/dashboard'),

  /** GET /stores/me — 404 when the signed-in user has no store yet. */
  getMyStore: () => api.get<ApiResponse<MyStore>>('/stores/me'),

  updateStore: (data: UpdateStorePayload) => api.patch<ApiResponse<MyStore>>('/stores/me', data),

  /** Logo/banner upload — same rail as listing images, separate folder. */
  uploadBranding: (file: File) => {
    const form = new FormData();
    form.append('images', file);
    return apiClient
      .post<ApiResponse<UploadedImage[]>>('/stores/me/listings/upload/images?folder=stores', form)
      .then((res) => res.data);
  },

  /**
   * POST /stores/me/subscription/charge — activate or retry.
   * Charges the user's WorldStreet dollar wallet; 402 means insufficient funds.
   */
  chargeSubscription: () =>
    api.post<ApiResponse<ChargeResult>>('/stores/me/subscription/charge'),

  cancelSubscription: () => api.post<ApiResponse<unknown>>('/stores/me/subscription/cancel'),
};

export default storeService;

// ─── Public (buyer-facing) ──────────────────────────────────────

export interface PublicStore {
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
  status: StoreStatus;
  verificationTier: string;
  avgRating: number;
  reviewCount: number;
  listingCount: number;
  /** The trust signals that replace an on-platform transaction record. */
  responseRate: number | null;
  avgResponseMins: number | null;
  /** Present once the malls feature ships; optional to tolerate deploy skew. */
  kind?: 'PERSONAL' | 'MALL_SUBSTORE';
  mallId?: string | null;
  /** Substores link back to their mall ("Part of <Mall>"). */
  mall?: { name: string; slug: string; status: string } | null;
  createdAt: string;
}

export interface PublicListing extends Omit<Listing, 'category'> {
  category: { id: string; name: string; slug: string; parentId: string | null } | null;
  store: PublicStore;
}

export const publicMarketplace = {
  /** GET /listings — browse. `attr.<Name>` params filter the structured layer. */
  browse: (params: Record<string, unknown>) =>
    api.get<{
      success: boolean;
      data: Array<Listing & { store: PublicStore }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/listings', params),

  /** GET /listings/:idOrSlug — accepts either, so links can be readable. */
  getListing: (idOrSlug: string) => api.get<ApiResponse<PublicListing>>(`/listings/${idOrSlug}`),

  getStore: (slug: string) => api.get<ApiResponse<PublicStore>>(`/stores/${slug}`),

  getStoreListings: (slug: string, params?: Record<string, unknown>) =>
    api.get<{
      success: boolean;
      data: Listing[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/stores/${slug}/listings`, params),
};
