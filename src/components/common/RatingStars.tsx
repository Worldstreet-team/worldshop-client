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

const STAR_PX: Record<NonNullable<RatingStarsProps['size']>, number> = {
  sm: 12,
  md: 14,
  lg: 18,
};

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

    // Star color comes from .ws-rating's svg rule (always orange, filled), so
    // the per-star classes only need to carry the interactive affordance.
    const starClass = interactive ? 'ws-rating__star' : '';

    const StarIcon = () => (
      <svg viewBox="0 0 24 24" width={STAR_PX[size]} height={STAR_PX[size]}>
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
      className={`ws-rating ${className}`.trim()}
      role={interactive ? undefined : 'img'}
      aria-label={interactive ? undefined : `Rating: ${rating} out of ${maxRating} stars`}
    >
      {Array.from({ length: maxRating }).map((_, index) => renderStar(index))}
      {showValue && <span className="ws-num">{rating.toFixed(1)}</span>}
      {reviewCount !== undefined && (
        <span className="ws-caption ws-subtle">({reviewCount} reviews)</span>
      )}
    </div>
  );
}
