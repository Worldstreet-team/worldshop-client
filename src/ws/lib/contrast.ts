/* WCAG 2.x contrast for computed CSS colours ("rgb(…)" / "rgba(…)"), including
   translucent foregrounds, which are composited over their background first. */

export type Rgba = { r: number; g: number; b: number; a: number };

export function parseRgb(css: string): Rgba {
  const m = css.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`Not an rgb() colour: ${css}`);
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r, g, b, a };
}

/** Paints `top` over an opaque `bottom`. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (t: number, u: number) => t * top.a + u * (1 - top.a);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

function luminance({ r, g, b }: Rgba) {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast of `fg` drawn on `bg`; `bg` must be opaque (composite it first). */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(composite(fg, bg)), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
