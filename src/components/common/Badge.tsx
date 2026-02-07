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
    'badge',
    `badge-${variant}`,
    `badge-${size}`,
    rounded ? 'badge-rounded' : '',
    outline ? 'badge-outline' : '',
    dot ? 'badge-dot' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {dot && <span className="badge-dot-indicator" aria-hidden="true" />}
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
    <Badge variant="danger" size="sm" className="sale-badge">
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
