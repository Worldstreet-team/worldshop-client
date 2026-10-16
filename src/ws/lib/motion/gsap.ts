/*
 * GSAP, loaded on demand, for timeline motion (result reveals). Motion handles component
 * state; GSAP handles sequences. gsap.matchMedia keeps every timeline behind the
 * reduced-motion check. Visibility comes from IntersectionObserver, not ScrollTrigger:
 * ScrollTrigger updates on every scroll frame, which showed up in scroll profiles.
 */

let loading: Promise<{ gsap: typeof import("gsap").gsap }> | null = null;

export function loadGsap() {
  loading ??= import("gsap").then(({ gsap }) => ({ gsap }));
  return loading;
}

export const REDUCED = "(prefers-reduced-motion: reduce)";
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
