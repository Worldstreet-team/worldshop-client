import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title = 'No items found',
  description = 'Try adjusting your search or filters to find what you are looking for.',
  icon,
  actionLabel,
  actionLink,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`ws ws-empty ${className}`.trim()}>
      <div className="ws-empty__icon">
        {icon || (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
      </div>
      <h3 className="ws-title">{title}</h3>
      {/* max ~36ch keeps the caption from running the full card width. */}
      <p className="ws-caption ws-muted" style={{ maxWidth: '36ch' }}>
        {description}
      </p>

      {/* Never more than one action, per 04-components. */}
      {actionLabel && (actionLink || onAction) && (
        actionLink ? (
          <Link to={actionLink} className="ws-btn ws-btn--primary ws-btn--sm">
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction} className="ws-btn ws-btn--primary ws-btn--sm">
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
