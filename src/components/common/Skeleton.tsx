interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  count?: number;
}

export default function Skeleton({
  width,
  height,
  variant = 'text',
  animation = 'pulse',
  className = '',
  count = 1,
}: SkeletonProps) {
  const baseClass = 'skeleton';
  const variantClass = `skeleton-${variant}`;
  const animationClass = animation !== 'none' ? `skeleton-${animation}` : '';

  const classes = [baseClass, variantClass, animationClass, className].filter(Boolean).join(' ');

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (count === 1) {
    return <div className={classes} style={style} aria-hidden="true" />;
  }

  return (
    <div className="skeleton-group" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={classes} style={style} />
      ))}
    </div>
  );
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }: { lines?: number; lastLineWidth?: string }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={16}
        />
      ))}
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="skeleton-product-card" aria-hidden="true">
      <Skeleton variant="rectangular" width="100%" height={200} />
      <div className="skeleton-product-card-content">
        <Skeleton variant="text" width="80%" height={14} />
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}
