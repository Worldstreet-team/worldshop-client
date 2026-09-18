import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { marketplaceReviewService, type MarketplaceReview } from '@/features/reviews/api';
import { useUIStore } from '@/shared/store/uiStore';
import { queryKeys } from '@/shared/lib/queryKeys';
import { MINUTE } from '@/app/providers/QueryProvider';
import { toApiError } from '@/shared/lib/api';

const PER_PAGE = 10;
const MIN_COMMENT = 10;
const NO_REVIEWS: MarketplaceReview[] = [];

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

export function useListingReviews(listingId: string) {
  const { isSignedIn } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();

  const [page, setPage] = useState(1);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.listingReviewPage(listingId, { page, verifiedOnly }),
    queryFn: () => marketplaceReviewService.forListing(listingId, { page, limit: PER_PAGE, verifiedOnly }),
    placeholderData: keepPreviousData,
    staleTime: 2 * MINUTE,
  });

  const eligibilityQuery = useQuery({
    queryKey: queryKeys.listingReviewEligibility(listingId),
    queryFn: () => marketplaceReviewService.eligibility(listingId).then((r) => r.data),
    enabled: Boolean(isSignedIn),
    staleTime: 2 * MINUTE,
  });

  const mineQuery = useQuery({
    queryKey: queryKeys.myListingReview(listingId),
    queryFn: () => marketplaceReviewService.mine(listingId).then((r) => r.data),
    enabled: Boolean(isSignedIn),
    staleTime: 2 * MINUTE,
  });

  const mine = mineQuery.data ?? null;

  const [formSeed, setFormSeed] = useState<string | null>(null);
  const mineId = mine?.id ?? null;
  if (formSeed !== mineId) {
    setFormSeed(mineId);
    setRating(mine?.rating ?? 5);
    setTitle(mine?.title ?? '');
    setComment(mine?.comment ?? '');
  }

  const refreshReviews = () => {
    client.invalidateQueries({ queryKey: queryKeys.listingReviews(listingId) });
    client.invalidateQueries({ queryKey: queryKeys.listingReviewEligibility(listingId) });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mine) {
        const res = await marketplaceReviewService.update(mine.id, {
          rating, title: title || null, comment: comment.trim(),
        });
        return { review: res.data, updated: true };
      }
      const res = await marketplaceReviewService.create(listingId, {
        rating, title: title || undefined, comment: comment.trim(),
      });
      return { review: res.data, updated: false };
    },
    onSuccess: ({ review, updated }) => {
      client.setQueryData(queryKeys.myListingReview(listingId), review);
      addToast({
        type: 'success',
        message: updated
          ? 'Review updated'
          : review.isVerified
            ? 'Review posted.'
            : 'Review posted. It shows as verified once the seller replies to your message.',
      });
      setWriting(false);
      setPage(1);
      refreshReviews();
    },
    onError: (err) => setFormError(errMessage(err, 'Could not post your review')),
  });

  const removeMutation = useMutation({
    mutationFn: (reviewId: string) => marketplaceReviewService.remove(reviewId),
    onSuccess: () => {
      client.setQueryData(queryKeys.myListingReview(listingId), null);
      addToast({ type: 'success', message: 'Review deleted' });
      refreshReviews();
    },
    onError: (err) => addToast({ type: 'error', message: errMessage(err, 'Could not delete your review') }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (comment.trim().length < MIN_COMMENT) {
      setFormError('Write at least a sentence so the review is useful to other buyers.');
      return;
    }
    saveMutation.mutate();
  };

  const removeMine = () => {
    if (!mine || !window.confirm('Delete your review?')) return;
    removeMutation.mutate(mine.id);
  };

  const summary = listQuery.data?.meta ?? null;

  return {
    isSignedIn: Boolean(isSignedIn),
    reviews: listQuery.data?.data ?? NO_REVIEWS,
    summary,
    count: summary?.reviewCount ?? 0,
    loading: listQuery.isPending,
    totalPages: listQuery.data?.pagination.totalPages ?? 1,
    page,
    setPage,
    verifiedOnly,
    setVerifiedOnly,
    eligibility: eligibilityQuery.data ?? null,
    mine,
    writing,
    setWriting,
    rating,
    setRating,
    title,
    setTitle,
    comment,
    setComment,
    formError,
    submitting: saveMutation.isPending,
    submit,
    removeMine,
  };
}
