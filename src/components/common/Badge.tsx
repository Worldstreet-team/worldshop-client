import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  outline?: boolean;
  dot?: boolean;
  className?: string;
}

// This component's variant list predates the system, which defines exactly four
// tones (Success / Warning / Danger / Neutral) plus the brand wash. Map onto
// those rather than inventing fills.
const TONE_CLASS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'ws-badge--neutral',
  primary: 'ws-badge--brand',
  secondary: 'ws-badge--neutral',
  success: 'ws-badge--success',
  warning: 'ws-badge--warning',
  danger: 'ws-badge--danger',
  info: 'ws-badge--info',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  outline = false,
  dot = false,
  className = '',
}: BadgeProps) {
  const classes = [
    'ws-badge',
    outline ? 'ws-badge--outline' : TONE_CLASS[variant],
    dot ? 'ws-badge--dot' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // The system's badge has one height (20) and one radius (7); `size` and
  // `rounded` survive for API compatibility but only `rounded` has a visual
  // effect, as a pill.
  const style = rounded ? { borderRadius: 'var(--ws-radius-pill)' } : undefined;

  return (
    <span className={classes} style={style} data-size={size}>
      {children}
    </span>
  );
}

// Preset badges for common order/product statuses
export function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    // Order statuses
    created: { variant: 'default', label: 'Created' },
    pending: { variant: 'warning', label: 'Pending' },
    paid: { variant: 'info', label: 'Paid' },
    processing: { variant: 'info', label: 'Processing' },
    shipped: { variant: 'primary', label: 'Shipped' },
    delivered: { variant: 'success', label: 'Delivered' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    refunded: { variant: 'secondary', label: 'Refunded' },
    // Product statuses
    in_stock: { variant: 'success', label: 'In Stock' },
    low_stock: { variant: 'warning', label: 'Low Stock' },
    out_of_stock: { variant: 'danger', label: 'Out of Stock' },
    // Generic
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'secondary', label: 'Inactive' },
    draft: { variant: 'default', label: 'Draft' },
  };

  const config = statusConfig[status.toLowerCase()] || { variant: 'default', label: status };

  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}

// Sale/Discount badge
export function SaleBadge({ percentage }: { percentage: number }) {
  return (
    <Badge variant="danger" size="sm" className="ws-num">
      -{percentage}%
    </Badge>
  );
}

// New product badge
export function NewBadge() {
  return (
    <Badge variant="primary" size="sm">
      New
    </Badge>
  );
}
