interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

// The spinner is sized by font-size (it is a 1em ring), so the scale is px here
// rather than a class per step.
const SIZE_PX: Record<NonNullable<LoadingSpinnerProps['size']>, number> = {
  sm: 16,
  md: 28,
  lg: 40,
};

export default function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  message,
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className="ws"
      role="status"
      aria-live="polite"
      style={{ display: 'grid', justifyItems: 'center', gap: 'var(--ws-space-3)' }}
    >
      <span className="ws-spinner" style={{ fontSize: SIZE_PX[size] }} aria-hidden="true" />
      {message && <p className="ws-caption ws-muted">{message}</p>}
    </div>
  );

  // Full-screen gets the branded boot loader (lockup + gold sweep) rather than
  // a labelled ring — `message` is intentionally ignored there.
  if (fullScreen) {
    return (
      <div
        className="ws"
        role="status"
        aria-label="Loading"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--ws-bg-page)',
          zIndex: 'var(--ws-z-modal)' as unknown as number,
        }}
      >
        <div className="ws-loader" aria-hidden>
          <span className="ws-loader__eyebrow">Worldstreet</span>
          <span className="ws-loader__word">
            shop<span className="ws-loader__dot">.</span>
          </span>
          <span className="ws-loader__bar" />
        </div>
      </div>
    );
  }

  return spinner;
}
