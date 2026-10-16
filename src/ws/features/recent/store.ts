import { useSyncExternalStore } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { createLocalStore } from "@ws/lib/local-store";
import { RECENT_COOKIE, encodeRecent } from "./cookie";

/* Recently viewed listings (B1 "Recently viewed", spec §4 RecentlyViewedRail), newest
   first, on this device only. */
const store = createLocalStore<readonly string[]>("ws:recently-viewed", [], (raw) =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, rules.home.recentlyViewedMax) : [],
);

export function useRecentlyViewed() {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

function write(ids: readonly string[]) {
  store.set(ids);
  document.cookie = `${RECENT_COOKIE}=${encodeRecent(ids)}; path=/; max-age=31536000; samesite=lax`;
}

export function recordView(id: string) {
  write([id, ...store.get().filter((x) => x !== id)].slice(0, rules.home.recentlyViewedMax));
}

export function clearRecentlyViewed() {
  write([]);
}
