"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { dur, ease } from "@ws/lib/motion/tokens";

/* Motion for the whole app. Features load after first paint (async LazyMotion), so
   motion adds almost nothing to the first-route budget (spec §16.7); `strict` keeps
   everyone on the lightweight `m.*` components. Reduced motion from the OS turns
   transforms off and keeps only opacity (R-010). */

const loadFeatures = () => import("./features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: dur.base, ease: ease.out }}>
      <LazyMotion features={loadFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
