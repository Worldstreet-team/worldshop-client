import { useState, useMemo } from 'react';
import type { Review } from '@/types/product.types';
import RatingStars from '@/components/common/RatingStars';
import Pagination from '@/components/common/Pagination';
import Badge from '@/components/common/Badge';

interface ProductReviewsProps {
  reviews: Review[];
  averageRating: number;
  totalCount: number;
  onWriteReview?: () => void;
  className?: string;
}

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';

const REVIEWS_PER_PAGE = 5;

export default function ProductReviews({
  reviews,
  averageRating,
  totalCount,
  onWriteReview,
  className = '',
}: ProductReviewsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating - 1]++;
      }
    });
    return distribution;
  }, [reviews]);

  // Filter and sort reviews
  const filteredAndSortedReviews = useMemo(() => {
    let result = filterRating
      ? reviews.filter((r) => r.rating === filterRating)
      : [...reviews];

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'highest':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        result.sort((a, b) => a.rating - b.rating);
        break;
      default:
        break;
    }

    return result;
  }, [reviews, sortBy, filterRating]);

  // Paginate
  const totalPages = Math.ceil(filteredAndSortedReviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = filteredAndSortedReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFilterClick = (rating: number) => {
    setFilterRating(filterRating === rating ? null : rating);
    setCurrentPage(1);
  };

  return (
    <div className={`product-reviews ${className}`}>
      {/* Reviews Summary */}
      <div className="product-reviews-summary">
        <div className="product-reviews-average">
          <span className="product-reviews-average-number">{averageRating.toFixed(1)}</span>
          <RatingStars rating={averageRating} size="lg" />
          <span className="product-reviews-count">Based on {totalCount} reviews</span>
        </div>

        <div className="product-reviews-distribution">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating - 1];
            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

            return (
              <button
                key={rating}
                type="button"
                className={`product-reviews-distribution-row ${
                  filterRating === rating ? 'active' : ''
                }`}
                onClick={() => handleFilterClick(rating)}
                aria-label={`Filter by ${rating} star reviews`}
              >
                <span className="product-reviews-distribution-stars">
                  {rating} <span className="star">★</span>
                </span>
                <div className="product-reviews-distribution-bar">
                  <div
                    className="product-reviews-distribution-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="product-reviews-distribution-count">{count}</span>
              </button>
            );
          })}
        </div>

        {onWriteReview && (
          <button
            type="button"
            className="btn btn-primary product-reviews-write-btn"
            onClick={onWriteReview}
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Reviews Controls */}
      <div className="product-reviews-controls">
        <div className="product-reviews-showing">
          Showing {paginatedReviews.length} of {filteredAndSortedReviews.length} reviews
          {filterRating && (
            <button
              type="button"
              className="product-reviews-clear-filter"
              onClick={() => setFilterRating(null)}
            >
              Clear filter ×
            </button>
          )}
        </div>

        <div className="product-reviews-sort">
          <label htmlFor="review-sort">Sort by:</label>
          <select
            id="review-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="product-reviews-sort-select"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {paginatedReviews.length > 0 ? (
        <div className="product-reviews-list">
          {paginatedReviews.map((review) => (
            <article key={review.id} className="product-review">
              <div className="product-review-header">
                <div className="product-review-avatar">
                  {getInitials(review.userName)}
                </div>
                <div className="product-review-meta">
                  <div className="product-review-author">
                    {review.userName}
                    {review.isVerified && (
                      <Badge variant="success" size="sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                  <div className="product-review-date">{formatDate(review.createdAt)}</div>
                </div>
                <div className="product-review-rating">
                  <RatingStars rating={review.rating} size="sm" />
                </div>
              </div>

              {review.title && (
                <h4 className="product-review-title">{review.title}</h4>
              )}

              <p className="product-review-content">{review.comment}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="product-reviews-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>No reviews yet</p>
          {onWriteReview && (
            <button type="button" className="btn btn-outline" onClick={onWriteReview}>
              Be the first to review
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
