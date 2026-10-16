"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MOTION_OK, loadGsap } from "@ws/lib/motion/gsap";
import { dur, gsapEase, rise, stagger } from "@ws/lib/motion/tokens";

/*
 * Items rise into place as they scroll into view, with the DS stagger. An
 * IntersectionObserver reports them (everything that enters in one frame arrives in one
 * callback, so it still reveals as a staggered batch) and GSAP tweens them; nothing runs
 * per scroll frame. Items already on screen at load only drift up a few pixels, without
 * fading, so the first photos still paint straight away (LCP). New items from "Show
 * more" join in. Nothing moves under reduced motion.
 */
export function RevealOnScroll({ children, count, selector = ":scope > ul > li" }: { children: ReactNode; count: number; selector?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let revert: (() => void) | undefined;
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const fresh = [...root.querySelectorAll<HTMLElement>(`${selector}:not([data-revealed])`)];
        // Read every position first, then write (no read/write interleaving).
        const fold = window.innerHeight * 0.92;
        const tops = fresh.map((el) => el.getBoundingClientRect().top);
        fresh.forEach((el) => el.setAttribute("data-revealed", ""));
        const onScreen = fresh.filter((_, i) => tops[i] < fold);
        const below = fresh.filter((_, i) => tops[i] >= fold);
        if (onScreen.length) gsap.from(onScreen, { y: 12, duration: dur.slow, ease: gsapEase.out, stagger, clearProps: "transform" });
        if (!below.length) return;
        gsap.set(below, { opacity: 0, y: rise });
        // Fires as an item's top passes 94% of the viewport height, once per item.
        const io = new IntersectionObserver(
          (entries) => {
            const batch = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
            if (!batch.length) return;
            batch.forEach((el) => io.unobserve(el));
            gsap.to(batch, { opacity: 1, y: 0, duration: dur.slow, ease: gsapEase.out, stagger, overwrite: true, clearProps: "transform,opacity" });
          },
          { rootMargin: "0px 0px -6% 0px" },
        );
        below.forEach((el) => io.observe(el));
        return () => io.disconnect();
      });
      revert = () => mm.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
  }, [count, selector]);

  return (
    <div ref={ref} className="ws-reveal">
      {children}
    </div>
  );
}
