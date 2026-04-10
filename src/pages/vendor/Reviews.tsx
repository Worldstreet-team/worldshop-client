import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { vendorService, type VendorReview, type VendorReviewFilters } from '@/services/vendorService';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

const renderStars = (rating: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={`material-icons star ${i < rating ? 'filled' : ''}`}>
      {i < rating ? 'star' : 'star_border'}
    </span>
  ));

export default function VendorReviews() {
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VendorReviewFilters>({
    page: 1,
    limit: 15,
    sortBy: 'newest',
  });
  const addToast = useUIStore((s) => s.addToast);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.getReviews(filters);
      setReviews(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load reviews' });
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div className="vendor-reviews">
      <div className="page-header">
        <h1>Customer Reviews {pagination && <small>({pagination.total})</small>}</h1>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select
          className="filter-select"
          value={filters.rating || ''}
          onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value ? Number(e.target.value) : undefined, page: 1 }))}
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        <select
          className="filter-select"
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as any, page: 1 }))}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="reviews-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="review-card skeleton">
              <div className="skeleton-row" style={{ height: 20, width: '40%' }} />
              <div className="skeleton-row" style={{ height: 16, width: '80%', marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons">rate_review</span>
          <h3>No Reviews Yet</h3>
          <p>Customer reviews for your products will appear here.</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="review-stars">{renderStars(review.rating)}</div>
                <span className="review-date">{formatDate(review.createdAt)}</span>
              </div>
              {review.title && <h4 className="review-title">{review.title}</h4>}
              <p className="review-comment">{review.comment}</p>
              <div className="review-meta">
                <span className="reviewer-name">
                  {review.userName}
                  {review.isVerified && (
                    <span className="verified-badge" title="Verified Purchase">
                      <span className="material-icons">verified</span>
                    </span>
                  )}
                </span>
                {review.productName && (
                  <Link to={`/products/${review.productSlug}`} className="review-product-link">
                    on {review.productName}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
