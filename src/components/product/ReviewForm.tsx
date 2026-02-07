import { useState } from 'react';

interface ReviewFormProps {
  productName: string;
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export interface ReviewFormData {
  rating: number;
  title: string;
  comment: string;
}

export default function ReviewForm({
  productName,
  onSubmit,
  onCancel,
  className = '',
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    if (comment.trim().length < 10) {
      setError('Review must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      // Reset form on success
      setRating(0);
      setTitle('');
      setComment('');
    } catch (err) {
      setError((err as Error).message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  const getRatingLabel = (value: number) => {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[value] || '';
  };

  return (
    <form className={`review-form ${className}`} onSubmit={handleSubmit}>
      <div className="review-form-header">
        <h3 className="review-form-title">Write a Review</h3>
        <p className="review-form-subtitle">
          Share your thoughts about <strong>{productName}</strong>
        </p>
      </div>

      {error && (
        <div className="review-form-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Rating Selection */}
      <div className="review-form-field">
        <label className="review-form-label">
          Your Rating <span className="required">*</span>
        </label>
        <div className="review-form-rating">
          <div 
            className="review-form-stars"
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`review-form-star ${star <= displayRating ? 'filled' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill={star <= displayRating ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  width="32"
                  height="32"
                >
                  <polygon
                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <span className="review-form-rating-label">{getRatingLabel(displayRating)}</span>
          )}
        </div>
      </div>

      {/* Review Title */}
      <div className="review-form-field">
        <label htmlFor="review-title" className="review-form-label">
          Review Title
        </label>
        <input
          type="text"
          id="review-title"
          className="review-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience (optional)"
          maxLength={100}
        />
      </div>

      {/* Review Comment */}
      <div className="review-form-field">
        <label htmlFor="review-comment" className="review-form-label">
          Your Review <span className="required">*</span>
        </label>
        <textarea
          id="review-comment"
          className="review-form-textarea"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like or dislike? How did you use the product?"
          rows={5}
          maxLength={2000}
        />
        <div className="review-form-char-count">
          {comment.length}/2000 characters
        </div>
      </div>

      {/* Form Actions */}
      <div className="review-form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline review-form-cancel"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary review-form-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="btn-loading">
              <svg className="spinner" viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
              </svg>
              Submitting...
            </span>
          ) : (
            'Submit Review'
          )}
        </button>
      </div>

      <p className="review-form-disclaimer">
        By submitting, you agree that your review complies with our guidelines and terms of service.
      </p>
    </form>
  );
}
