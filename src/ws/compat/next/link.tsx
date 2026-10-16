import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link as RouterLink } from "react-router-dom";

/*
 * next/link on react-router. The WorldStore UI was written for Next's App Router; this
 * keeps its components unchanged. Hash links and absolute URLs stay plain anchors,
 * since the router would treat "#reviews" as a route.
 */

type Href = string | { pathname?: string; query?: Record<string, string | number | undefined>; hash?: string };

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: Href;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
};

export function hrefToString(href: Href): string {
  if (typeof href === "string") return href;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) if (v !== undefined) qs.set(k, String(v));
  const search = qs.toString();
  return `${href.pathname ?? ""}${search ? `?${search}` : ""}${href.hash ? `#${href.hash.replace(/^#/, "")}` : ""}`;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, prefetch: _prefetch, replace, scroll, ...rest }, ref) {
  const to = hrefToString(href);
  if (/^(https?:|mailto:|tel:|#|\/\/)/.test(to)) return <a ref={ref} href={to} {...rest} />;
  return <RouterLink ref={ref} to={to} replace={replace} preventScrollReset={scroll === false} {...rest} />;
});

export default Link;
