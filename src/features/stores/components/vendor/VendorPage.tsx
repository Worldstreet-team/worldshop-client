import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, EyeOff, type LucideIcon } from 'lucide-react';
import type { Listing } from '@/features/stores/api';

/**
 * The sandbox's vendor page parts, one per component it defines: the page
 * column, the page header over a rule, a section header, and the stat card.
 * Every vendor page is built from these so they share one rhythm.
 */

export function VendorPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={`ws-vxpage${wide ? ' ws-vxpage--wide' : ''}`}>{children}</div>;
}

export function VendorPageHead({
  title,
  description,
  action,
  before,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Above the title, for a back link. */
  before?: ReactNode;
}) {
  return (
    <header className="ws-vxhead">
      <div>
        {before}
        <h1 className="ws-vxhead__title">{title}</h1>
        {description && <p className="ws-vxhead__desc">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function VendorSectionHead({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="ws-vxsec">
      <div>
        <h2 className="ws-vxsec__title">{title}</h2>
        {description && <p className="ws-vxsec__desc">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function VendorStat({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="ws-vxstat">
      <div className="ws-vxstat__top">
        <span>{label}</span>
        <Icon size={16} aria-hidden />
      </div>
      <p className="ws-vxstat__value ws-num">{value}</p>
      {detail && <p className="ws-vxstat__detail">{detail}</p>}
    </div>
  );
}

/** The sandbox's status badge: a tinted pill with a leading icon. */
export function VendorBadge({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'success' | 'pending' | 'info' | 'neutral' | 'danger';
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <span className={`ws-vxbadge ws-vxbadge--${tone}`}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  );
}

const STATUS: Record<
  Listing['status'],
  { tone: 'success' | 'pending' | 'neutral' | 'danger'; label: string; Icon: LucideIcon }
> = {
  PUBLISHED: { tone: 'success', label: 'Active', Icon: CheckCircle2 },
  DRAFT: { tone: 'pending', label: 'Draft', Icon: Clock },
  HIDDEN: { tone: 'neutral', label: 'Hidden', Icon: EyeOff },
  REMOVED: { tone: 'danger', label: 'Removed by admin', Icon: AlertCircle },
};

/** A listing's state in the sandbox's wording: Published reads as "Active". */
export function ListingStatus({ status }: { status: Listing['status'] }) {
  const s = STATUS[status];
  return (
    <VendorBadge tone={s.tone} icon={s.Icon}>
      {s.label}
    </VendorBadge>
  );
}
