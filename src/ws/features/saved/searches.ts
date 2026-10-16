import { useSyncExternalStore } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { createLocalStore } from "@ws/lib/local-store";

/* Saved searches (B4, spec §6 SaveSearchButton): a results page's URL and a label, on
   this device until accounts exist (then alerts can be sent for them, R-012). */

export type SavedSearch = { href: string; label: string; at: string };

const store = createLocalStore<readonly SavedSearch[]>("ws:saved-searches", [], (raw) =>
  Array.isArray(raw)
    ? raw.filter((s): s is SavedSearch => typeof s === "object" && s !== null && typeof s.href === "string" && s.href.startsWith("/search") && typeof s.label === "string")
    : [],
);

export function useSavedSearches() {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

/** "full" at the cap (R-027: 50 saved searches). */
export function saveSearch(href: string, label: string): "saved" | "full" {
  const list = store.get().filter((s) => s.href !== href);
  if (list.length >= rules.saved.maxSearches) return "full";
  store.set([{ href, label, at: new Date().toISOString() }, ...list]);
  return "saved";
}

export function unsaveSearch(href: string) {
  store.set(store.get().filter((s) => s.href !== href));
}
