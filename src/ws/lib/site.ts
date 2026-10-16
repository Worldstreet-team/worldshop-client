import { headers } from "next/headers";

/** The site's origin for links people share: SITE_URL where set, else the request's host. */
export async function siteOrigin(): Promise<string> {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured) return new URL(configured).origin;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** The time this request is rendered at (delivery dates, "listed 3 days ago"). */
export function requestTime(): number {
  return Date.now();
}
