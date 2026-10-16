import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@ws/lib/cx";

/* DS Chip, DeltaChip and Count (`.cx-chip`, `.cx-count`). Tones carry meaning:
   gain = good for the user (received, savings), loss = errors, warning = needs attention,
   brand = programme labels. Neutral is the default. */

export type ChipTone = "neutral" | "gain" | "loss" | "warning" | "brand";

type ChipProps = HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone; dot?: boolean; children: ReactNode };

export function Chip({ tone = "neutral", dot, className, children, ...rest }: ChipProps) {
  return (
    <span className={cx("cx-chip", tone !== "neutral" && `cx-chip--${tone}`, dot && "cx-chip--dot", className)} {...rest}>
      {children}
    </span>
  );
}

/** A signed percentage change. The arrow and sign are visual; screen readers get words.
 *  (The DS puts aria-label on a bare span, which assistive tech doesn't reliably read.) */
export function DeltaChip({ value, digits = 2 }: { value: number; digits?: number }) {
  const up = value >= 0;
  const text = `${Math.abs(value).toFixed(digits)}%`;
  return (
    <Chip tone={up ? "gain" : "loss"}>
      <span aria-hidden="true">{up ? "▲" : "▼"} {text}</span>
      <span className="cx-sr-only">{up ? "up" : "down"} {text}</span>
    </Chip>
  );
}

/** Unread/action badge. Over `max` reads "99+". `dot` shows presence without a number,
 *  so the control it sits on must say what it means in its own label. */
export function Count({ value, max = 99, dot, className }: { value?: number; max?: number; dot?: boolean; className?: string }) {
  if (dot) return <span className={cx("cx-count cx-count--dot", className)} aria-hidden="true" />;
  if (!value) return null;
  return <span className={cx("cx-count", className)}>{value > max ? `${max}+` : value}</span>;
}
