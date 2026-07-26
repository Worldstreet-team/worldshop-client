import { api } from './api';
import type { ApiResponse } from '@/types/common.types';

/**
 * Listing and store reviews.
 *
 * Reviews are anchored to chat, not to a purchase — there are no purchases.
 * Reviewing requires having messaged the seller about the item; the verified
 * badge additionally requires that they replied. That split is deliberate:
 * requiring a reply to review at all would let a seller silence anyone by
 * ignoring them.
 */

export interface MarketplaceReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  userName: string;
  userId: string;
  /** True when the seller actually replied to this reviewer. */
  isVerified: boolean;
  vendorReply: string | null;
  vendorRepliedAt: string | null;
  status: 'PUBLISHED' | 'FLAGGED' | 'REMOVED';
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; slug: string };
}

export interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  verifiedCount?: number;
  responseRate?: number | null;
  avgResponseMins?: number | null;
}

export interface ReviewEligibility {
  canReview: boolean;
  wouldBeVerified: boolean;
  reason?: string;
  conversationId?: string;
}

type ReviewListResponse = {
  success: boolean;
  data: MarketplaceReview[];
  meta: ReviewSummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const marketplaceReviewService = {
  forListing: (listingId: string, params?: { page?: number; limit?: number; verifiedOnly?: boolean }) =>
    api.get<ReviewListResponse>(`/listings/${listingId}/reviews`, params as Record<string, unknown>),

  forStore: (slug: string, params?: { page?: number; limit?: number; verifiedOnly?: boolean }) =>
    api.get<ReviewListResponse>(`/stores/${slug}/reviews`, params as Record<string, unknown>),

  /**
   * The owner's own reviews. Separate from the public store route, which
   * enforces visibility — a vendor whose subscription lapsed still needs to read
   * and answer reviews.
   */
  mineAsVendor: (params?: { page?: number; limit?: number; unrepliedOnly?: boolean }) =>
    api.get<ReviewListResponse>('/stores/me/reviews', params as Record<string, unknown>),

  /** Removes the vendor's reply, leaving the review standing. */
  removeReply: (reviewId: string) =>
    api.delete<ApiResponse<MarketplaceReview>>(`/reviews/${reviewId}/reply`),

  /** Lets the UI explain the rule before someone writes a review. */
  eligibility: (listingId: string) =>
    api.get<ApiResponse<ReviewEligibility>>(`/listings/${listingId}/reviews/eligibility`),

  mine: (listingId: string) =>
    api.get<ApiResponse<MarketplaceReview | null>>(`/listings/${listingId}/reviews/mine`),

  create: (listingId: string, data: { rating: number; title?: string; comment: string }) =>
    api.post<ApiResponse<MarketplaceReview>>(`/listings/${listingId}/reviews`, data),

  update: (reviewId: string, data: { rating?: number; title?: string | null; comment?: string }) =>
    api.patch<ApiResponse<MarketplaceReview>>(`/reviews/${reviewId}`, data),

  remove: (reviewId: string) => api.delete<ApiResponse<null>>(`/reviews/${reviewId}`),

  /** Vendor's public right of reply. */
  reply: (reviewId: string, reply: string) =>
    api.post<ApiResponse<MarketplaceReview>>(`/reviews/${reviewId}/reply`, { reply }),
};

export default marketplaceReviewService;
