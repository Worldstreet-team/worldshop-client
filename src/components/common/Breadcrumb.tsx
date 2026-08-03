import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from '@/types/common.types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

// 12px chevron-right in text/subtle is the system separator; a caller can still
// override it.
const CHEVRON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Breadcrumb({
  items,
  separator = CHEVRON,
  className = '',
}: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav className={`ws-crumbs ${className}`.trim()} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.href || item.label} style={{ display: 'contents' }}>
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? 'page' : undefined}
                style={isLast ? { color: 'var(--ws-text-primary)', fontWeight: 500 } : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link to={item.href}>{item.label}</Link>
            )}
            {!isLast && <span aria-hidden="true">{separator}</span>}
          </span>
        );
      })}
    </nav>
  );
}
