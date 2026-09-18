import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

/**
 * The screens the three route guards share.
 *
 * ProtectedRoute, AdminRoute and VendorRoute each need a "still resolving" and
 * a "you are not allowed in" state, and were carrying three near-identical
 * copies of both. Keeping them here means a change to the gate's look happens
 * once, and the guards stay about the access rules they actually differ on.
 *
 * These render outside MainLayout, so each root carries `ws` itself rather than
 * inheriting the token-driven typography from an ancestor.
 */

/** Clerk is initializing, or a profile/store lookup is still in flight. */
export function GateLoading() {
  return (
    <div
      className="ws"
      style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}
      role="status"
      aria-live="polite"
    >
      <span className="ws-spinner" style={{ fontSize: 28 }} aria-hidden="true" />
      <span className="ws-caption ws-muted" style={{ marginTop: 'var(--ws-space-3)' }}>
        Loading…
      </span>
    </div>
  );
}

interface GateBlockedProps {
  title: string;
  message: string;
  /** Where the primary action goes. Omit for a dead end (e.g. a ban). */
  actionTo?: string;
  actionLabel?: string;
  /** Danger tone for terminal states like a ban, neutral for a sign-in prompt. */
  tone?: 'neutral' | 'danger';
}

export function GateBlocked({
  title,
  message,
  actionTo,
  actionLabel,
  tone = 'neutral',
}: GateBlockedProps) {
  return (
    <div className="ws" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', padding: 'var(--ws-space-6)' }}>
      <div className="ws-empty">
        <div
          className="ws-empty__icon"
          style={tone === 'danger' ? { color: 'var(--ws-status-danger)' } : undefined}
        >
          <ShieldAlert size={26} aria-hidden />
        </div>
        <h2 className="ws-title">{title}</h2>
        <p className="ws-caption ws-muted" style={{ maxWidth: '40ch' }}>
          {message}
        </p>
        {actionTo && actionLabel && (
          <Link to={actionTo} className="ws-btn ws-btn--sm ws-btn--primary">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
