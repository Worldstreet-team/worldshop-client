import { api } from './api';
import type { Review } from '@/types/product.types';
import type { ApiResponse } from '@/types/common.types';

export interface ReviewSummary {
    averageRating: number;
    totalCount: number;
    distribution: Record<number, number>;
}

export interface ReviewsResponse {
    data: Review[];
    summary: ReviewSummary;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export interface CreateReviewInput {
    rating: number;
    title?: string;
    comment: string;
}

export interface UpdateReviewInput {
    rating?: number;
    title?: string | null;
    comment?: string;
}

export const reviewService = {
    /** Get paginated reviews for a product */
    getProductReviews: async (
        productId: string,
        options: { sortBy?: string; rating?: number } = {},
        page = 1,
        limit = 10,
    ): Promise<ReviewsResponse> => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (options.sortBy) params.set('sortBy', options.sortBy);
        if (options.rating) params.set('rating', String(options.rating));

        const res = await api.get<ApiResponse<ReviewsResponse>>(
            `/products/${productId}/reviews?${params.toString()}`,
        );
        // The backend returns { success, data, summary, pagination }
        const payload = res.data as unknown as { success: boolean; data: Review[]; summary: ReviewSummary; pagination: ReviewsResponse['pagination'] };
        return {
            data: payload.data,
            summary: payload.summary,
            pagination: payload.pagination,
        };
    },

    /** Get review summary for a product */
    getSummary: async (productId: string): Promise<ReviewSummary> => {
        const res = await api.get<ApiResponse<{ summary: ReviewSummary }>>(
            `/products/${productId}/reviews/summary`,
        );
        return (res.data as unknown as { summary: ReviewSummary }).summary;
    },

    /** Get current user's review for a product */
    getMyReview: async (productId: string): Promise<Review | null> => {
        const res = await api.get<ApiResponse<{ review: Review | null }>>(
            `/products/${productId}/reviews/mine`,
        );
        return (res.data as unknown as { review: Review | null }).review;
    },

    /** Create a review */
    create: async (productId: string, data: CreateReviewInput): Promise<Review> => {
        const res = await api.post<ApiResponse<{ review: Review }>>(
            `/products/${productId}/reviews`,
            data,
        );
        return (res.data as unknown as { review: Review }).review;
    },

    /** Update own review */
    update: async (productId: string, reviewId: string, data: UpdateReviewInput): Promise<Review> => {
        const res = await api.put<ApiResponse<{ review: Review }>>(
            `/products/${productId}/reviews/${reviewId}`,
            data,
        );
        return (res.data as unknown as { review: Review }).review;
    },

    /** Delete own review */
    delete: async (productId: string, reviewId: string): Promise<void> => {
        await api.delete(`/products/${productId}/reviews/${reviewId}`);
    },
};
