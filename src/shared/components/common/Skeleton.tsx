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
  const classes = ['ws-skeleton', className].filter(Boolean).join(' ');

  // 04-components: Line radius 4, Circle a full round, Card radius 13.
  const radius =
    variant === 'circular'
      ? 'var(--ws-radius-pill)'
      : variant === 'rounded' || variant === 'rectangular'
        ? 'var(--ws-radius-xl)'
        : 'var(--ws-radius-sm)';

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: radius,
    // The shimmer is the sweep on ::after; `none` disables it without changing
    // the block's geometry.
    animation: animation === 'none' ? 'none' : undefined,
  };

  if (count === 1) {
    return <div className={classes} style={style} aria-hidden="true" />;
  }

  return (
    <div className="ws-stack" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={classes} style={style} />
      ))}
    </div>
  );
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }: { lines?: number; lastLineWidth?: string }) {
  return (
    <div className="ws-stack" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={12}
        />
      ))}
    </div>
  );
}

// Mirrors .ws-pcard's geometry — one skeleton per content block, per the spec.
export function SkeletonProductCard() {
  return (
    <div className="ws-card ws-card--flush" aria-hidden="true">
      <Skeleton variant="rectangular" width="100%" height={200} />
      <div className="ws-stack" style={{ padding: 'var(--ws-space-3)' }}>
        <Skeleton variant="text" width="80%" height={12} />
        <Skeleton variant="text" width="60%" height={18} />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}
