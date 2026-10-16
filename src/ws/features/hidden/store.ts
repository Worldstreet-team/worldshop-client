import { useSyncExternalStore } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { createLocalStore } from "@ws/lib/local-store";
import { HIDDEN_COOKIE, encodeHidden } from "./cookie";

/* "Not interested" and "Hide seller" (spec §5.3 HideListingMenuItem). Kept on this
   device, and mirrored into a cookie so the server leaves hidden items out of results
   and counts. `recent` remembers what was hidden in this visit, so that card can offer
   Undo while older hides just vanish. */

type Hidden = { listings: readonly string[]; sellers: readonly string[] };

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const store = createLocalStore<Hidden>("ws:hidden", { listings: [], sellers: [] }, (raw) => {
  const r = (raw ?? {}) as Partial<Record<keyof Hidden, unknown>>;
  return { listings: strings(r.listings), sellers: strings(r.sellers) };
});

function save(next: Hidden) {
  // Oldest drop off first, so the cookie stays small.
  const capped = { listings: next.listings.slice(-rules.hidden.maxListings), sellers: next.sellers.slice(-rules.hidden.maxSellers) };
  store.set(capped);
  writeCookie(capped);
}

function writeCookie(h: Hidden) {
  try {
    document.cookie = `${HIDDEN_COOKIE}=${encodeHidden(h)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // No cookies: hides still work on this page, the server just won't know.
  }
}

// Hides made before the cookie existed reach the server from the next request on.
if (typeof window !== "undefined") queueMicrotask(() => writeCookie(store.get()));

/** `from` is the card the buyer used, which is the only one that offers Undo. */
let recent: { kind: "listing" | "seller"; id: string; from: string } | null = null;

export function useHidden() {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

export function hiddenThisVisit() {
  return recent;
}

export function hideListing(id: string) {
  const h = store.get();
  recent = { kind: "listing", id, from: id };
  if (!h.listings.includes(id)) save({ ...h, listings: [...h.listings, id] });
}

export function hideSeller(id: string, fromListing: string) {
  const h = store.get();
  recent = { kind: "seller", id, from: fromListing };
  if (!h.sellers.includes(id)) save({ ...h, sellers: [...h.sellers, id] });
}

export function unhide(kind: "listing" | "seller", id: string) {
  const h = store.get();
  if (recent?.kind === kind && recent.id === id) recent = null;
  save(kind === "listing" ? { ...h, listings: h.listings.filter((x) => x !== id) } : { ...h, sellers: h.sellers.filter((x) => x !== id) });
}
