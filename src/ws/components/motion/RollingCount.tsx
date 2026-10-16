"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { formatCount } from "@ws/lib/format";
import { dur, ease } from "@ws/lib/motion/tokens";

/* A count that rolls from its old value to the new one when results change (the
   results header, never prices). It settles in 0.6s; the text is always a real number. */
export function RollingCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const controls = animate(shown.current, value, {
      duration: reduce ? 0 : dur.slow,
      ease: ease.out,
      onUpdate: (v) => (el.textContent = formatCount(Math.round(v))),
    });
    shown.current = value;
    return () => controls.stop();
  }, [value]);

  return (
    <span ref={ref} className="ws-rolling">
      {formatCount(value)}
    </span>
  );
}
