"use client";

import { ThreeStage } from "./ThreeStage";

const loadHero = () => import("./scenes/hero").then((m) => m.hero);

/* The home hero's 3D backdrop (S0.10). Decorative: the headline and buttons sit on
   top in markup, so the pointer is read from the hero around it. `step` counts slide
   moves (+1 next, −1 back) and the ring turns with each one. Without 3D, a still gold
   glow takes its place. */
export function HeroStage({ className, step = 0 }: { className?: string; step?: number }) {
  return <ThreeStage load={loadHero} className={className} step={step} pointerScope="parent" fallback={<div className="ws-stage__glow" />} />;
}
