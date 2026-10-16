"use client";

import { animate } from "motion/react";
import { useEffect, type RefObject } from "react";
import { spring } from "@ws/lib/motion/tokens";

/* Primary buttons lean towards a nearby pointer and spring back (DS Magnetic pattern).
   Fine pointers only, never under reduced motion. */
export function useMagnetic(ref: RefObject<HTMLElement | null>, strength = 0.22) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ok = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!ok.matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      animate(el, { x: (e.clientX - (r.left + r.width / 2)) * strength, y: (e.clientY - (r.top + r.height / 2)) * strength }, spring.soft);
    };
    const leave = () => animate(el, { x: 0, y: 0 }, spring.bouncy);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref, strength]);
}
