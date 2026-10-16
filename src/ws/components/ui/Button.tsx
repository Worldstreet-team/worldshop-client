import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@ws/lib/cx";

/* DS Button (`.cx-btn`). Solid is the gold accent, and the spec allows one per view
   (§1.1): Buy now, Pay, the page's main action. Everything else is ghost or quiet.
   `loading` keeps the button focusable (aria-disabled, not disabled) and shows the DS
   spinner through aria-busy. Pass `href` to render a link that looks like a button. */

type Variant = "solid" | "ghost" | "quiet" | "danger";
type Size = "sm" | "md" | "lg";

type Common = {
  variant?: Variant;
  size?: Size;
  /** Nudges the trailing icon on hover (DS `--arrow`). */
  arrow?: boolean;
  block?: boolean;
  loading?: boolean;
  className?: string;
  children: ReactNode;
};
/** Icon-only buttons must carry a name. */
type IconOnly = { icon: true; "aria-label": string } | { icon?: false };

type AsButton = Common & IconOnly & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
type AsLink = Common & IconOnly & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & { href: string };
export type ButtonProps = AsButton | AsLink;

export function buttonClass({ variant = "solid", size = "md", arrow, icon, block, className }: Pick<Common, "variant" | "size" | "arrow" | "block" | "className"> & { icon?: boolean }) {
  return cx(
    "cx-btn",
    variant !== "solid" && `cx-btn--${variant}`,
    size !== "md" && `cx-btn--${size}`,
    arrow && "cx-btn--arrow",
    icon && "cx-btn--icon",
    block && "cx-btn--block",
    className,
  );
}

export function Button(props: ButtonProps) {
  const { variant, size, arrow, icon, block, loading, className, children, ...rest } = props;
  const cls = buttonClass({ variant, size, arrow, icon, block, className });
  const busy = loading ? { "aria-busy": true, "aria-disabled": true } : {};

  if (rest.href !== undefined) {
    const { href, onClick, ...link } = rest as AsLink;
    return (
      <Link href={href} className={cls} {...busy} {...link} onClick={loading ? (e) => e.preventDefault() : onClick}>
        {children}
      </Link>
    );
  }
  const { type = "button", onClick, ...button } = rest as AsButton;
  return (
    <button type={type} className={cls} {...busy} {...button} onClick={loading ? (e) => e.preventDefault() : onClick}>
      {children}
    </button>
  );
}
