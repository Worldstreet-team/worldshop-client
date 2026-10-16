/* Hidden listings and sellers, mirrored into a cookie so the server can leave them out
   of results, counts and pages (no reload flash, correct "Showing 24 of N"). Ids only;
   anything that doesn't look like an id is dropped when read. */

export const HIDDEN_COOKIE = "ws-hidden";

export type HiddenIds = { listings: readonly string[]; sellers: readonly string[] };

const ID = /^[A-Za-z0-9]{1,32}$/;

export function encodeHidden(h: HiddenIds) {
  return encodeURIComponent(JSON.stringify({ l: h.listings, s: h.sellers }));
}

export function decodeHidden(value: string | undefined): HiddenIds {
  try {
    const raw = JSON.parse(decodeURIComponent(value ?? "")) as { l?: unknown; s?: unknown };
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ID.test(x)) : []);
    return { listings: ids(raw.l), sellers: ids(raw.s) };
  } catch {
    return { listings: [], sellers: [] };
  }
}
