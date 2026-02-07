import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from '@/types/common.types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export default function Breadcrumb({
  items,
  separator = '/',
  className = '',
}: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href || item.label} className="breadcrumb-item">
              {isLast || !item.href ? (
                <span
                  className={`breadcrumb-text ${isLast ? 'breadcrumb-current' : ''}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
