import type { CSSProperties, ImgHTMLAttributes } from "react";

/*
 * next/image as a plain <img>. Vercel's optimiser is not here, so `quality` and
 * `unoptimized` have nothing to drive; `fill` keeps its layout meaning (cover the
 * positioned parent) and `priority` keeps its loading meaning.
 */

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
};

const FILL: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };

export default function Image({ fill, priority, quality: _quality, unoptimized: _u, placeholder: _p, blurDataURL: _b, style, loading, ...rest }: ImageProps) {
  return (
    <img
      {...rest}
      loading={priority ? "eager" : (loading ?? "lazy")}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      style={fill ? { ...FILL, ...style } : style}
    />
  );
}
