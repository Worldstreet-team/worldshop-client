import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@ws/lib/cx";

/* DS surfaces: Card (`.cx-card` + lit hairline), IconTile, Badge (eyebrow pill),
   Avatar, Skeleton and EmptyState. */

type Orb = "tl" | "tr" | "bl" | "br" | "center";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section" | "li";
  /** Floating surface with a shadow (DS: shadows only for things that float). */
  elevated?: boolean;
  /** Hover lift for cards that are one big target. */
  interactive?: boolean;
  /** Soft brand glow in a corner. Brand surfaces only, never grid cards (spec §1.3). */
  orb?: Orb;
};

export function Card({ as: Tag = "div", elevated, interactive, orb, className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx("cx-card cx-lit", elevated && "cx-card--elevated", interactive && "cx-card--interactive", className)} {...rest}>
      {orb && <span className={`cx-orb cx-orb--${orb}`} aria-hidden="true" />}
      <span className="cx-lit-2" aria-hidden="true" />
      {children}
    </Tag>
  );
}

export function IconTile({ size = "md", children }: { size?: "sm" | "md"; children: ReactNode }) {
  return <div className={cx("cx-icon-tile", size === "sm" && "cx-icon-tile--sm")}>{children}</div>;
}

/** Section eyebrow ("Near you", "Deals ending soon") and policy tags. */
export function Badge({ icon, lit = true, children }: { icon?: ReactNode; lit?: boolean; children: ReactNode }) {
  return (
    <span className={cx("cx-badge", lit && "cx-lit")}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  src?: string;
  /** Online / available dot. */
  status?: boolean;
  brand?: boolean;
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, size = "md", src, status, brand }: AvatarProps) {
  return (
    <span role="img" aria-label={name} className={cx("cx-avatar", size !== "md" && `cx-avatar--${size}`, brand && "cx-avatar--brand")}>
      {/* The wrapper carries the name, so the picture itself is decorative. */}
      
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
      {status && <span className="cx-avatar-status" aria-hidden="true" />}
    </span>
  );
}

/** One shimmering block. Wrap a group of them in an element with role="status",
 *  aria-busy and a label ("Loading results"), and size them like the real content. */
export function Skeleton({ width, height, radius, className }: { width?: number | string; height?: number | string; radius?: number | string; className?: string }) {
  return <div aria-hidden="true" className={cx("cx-skel", className)} style={{ width, height, borderRadius: radius }} />;
}

type EmptyProps = {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  /** One next action (R-007). */
  action?: ReactNode;
  tone?: "default" | "error";
  /** Keep the page's heading order: h2 by default, h1 when it is the whole page (errors). */
  headingLevel?: "h1" | "h2" | "h3";
};

export function EmptyState({ icon, title, children, action, tone = "default", headingLevel: H = "h2" }: EmptyProps) {
  return (
    <div className={cx("cx-empty", tone === "error" && "cx-empty--error")}>
      <IconTile>{icon}</IconTile>
      <H className="cx-h4">{title}</H>
      {children && <p className="cx-small">{children}</p>}
      {action}
    </div>
  );
}
