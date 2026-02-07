interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  reviewCount?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export default function RatingStars({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
  reviewCount,
  interactive = false,
  onChange,
  className = '',
}: RatingStarsProps) {
  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, value: number) => {
    if (interactive && onChange && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onChange(value);
    }
  };

  const renderStar = (index: number) => {
    const value = index + 1;
    const filled = rating >= value;
    const halfFilled = rating >= value - 0.5 && rating < value;

    const starClass = [
      'rating-star',
      filled ? 'rating-star-filled' : halfFilled ? 'rating-star-half' : 'rating-star-empty',
      interactive ? 'rating-star-interactive' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const StarIcon = () => (
      <svg viewBox="0 0 24 24" className="rating-star-icon">
        {halfFilled ? (
          <>
            <defs>
              <linearGradient id={`half-${index}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#half-${index})`}
              stroke="currentColor"
              strokeWidth="1"
            />
          </>
        ) : (
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1"
          />
        )}
      </svg>
    );

    if (interactive) {
      return (
        <button
          key={index}
          type="button"
          className={starClass}
          onClick={() => handleClick(value)}
          onKeyDown={(e) => handleKeyDown(e, value)}
          aria-label={`Rate ${value} out of ${maxRating} stars`}
        >
          <StarIcon />
        </button>
      );
    }

    return (
      <span key={index} className={starClass} aria-hidden="true">
        <StarIcon />
      </span>
    );
  };

  return (
    <div
      className={`rating rating-${size} ${className}`}
      role={interactive ? undefined : 'img'}
      aria-label={interactive ? undefined : `Rating: ${rating} out of ${maxRating} stars`}
    >
      <div className="rating-stars">
        {Array.from({ length: maxRating }).map((_, index) => renderStar(index))}
      </div>
      {showValue && <span className="rating-value">{rating.toFixed(1)}</span>}
      {reviewCount !== undefined && (
        <span className="rating-count">({reviewCount} reviews)</span>
      )}
    </div>
  );
}
