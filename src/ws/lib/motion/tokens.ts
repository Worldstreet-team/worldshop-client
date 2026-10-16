/*
 * Motion tokens for Motion (motion.dev) and GSAP, mirroring the DS CSS tokens so JS
 * and CSS animations feel like one system (styles/ds/tokens.css: --cx-ease,
 * --cx-dur*, --cx-spring*, --cx-stagger, --cx-rise). Expressive, by the owner's
 * choice (6 Oct), but prices never animate in lists (spec §5.3).
 */

export const ease = {
  /** --cx-ease: fast out, gentle settle. Entrances and most UI. */
  out: [0.22, 1, 0.36, 1] as const,
  /** --cx-ease-in-out: symmetric, for things that move across the screen. */
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Exits leave quicker than they arrive. */
  in: [0.55, 0, 1, 0.45] as const,
};

/** GSAP spellings of the same curves. */
export const gsapEase = { out: "expo.out", inOut: "power3.inOut", in: "power3.in" } as const;

/** Seconds (Motion and GSAP use seconds). */
export const dur = { fast: 0.14, base: 0.24, slow: 0.6, reveal: 0.9 } as const;

/** Springs matched to --cx-spring, --cx-spring-snappy and --cx-spring-bouncy by eye. */
export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 26, mass: 1 },
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.8 },
  bouncy: { type: "spring", stiffness: 420, damping: 13, mass: 0.9 },
} as const;

export const stagger = 0.06; // --cx-stagger
export const rise = 24; // --cx-rise, px
