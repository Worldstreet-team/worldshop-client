"use client";

import { useState, type ReactNode } from "react";

/* DS Tooltip (`.cx-tip[data-tip]`): a CSS label shown on hover and keyboard focus.
   The pseudo-element text isn't read by screen readers, so the wrapped control must
   carry the same words as its accessible name (aria-label on an icon button).
   Escape hides it without moving focus (WCAG 1.4.13). */

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <span
      className="cx-tip"
      data-tip={label}
      data-dismissed={dismissed || undefined}
      onKeyDown={(e) => e.key === "Escape" && setDismissed(true)}
      onMouseLeave={() => setDismissed(false)}
      onBlur={() => setDismissed(false)}
    >
      {children}
    </span>
  );
}
