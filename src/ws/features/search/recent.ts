import { useSyncExternalStore } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { createLocalStore } from "@ws/lib/local-store";

/* Recent searches (B2 step 1), on this device only, newest first. */

const MAX = rules.search.recentStored;
const store = createLocalStore<readonly string[]>("ws:recent-searches", [], (raw) =>
  Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string").slice(0, MAX) : [],
);

export function useRecentSearches() {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

export function addRecentSearch(term: string) {
  const t = term.trim();
  if (!t) return;
  store.set([t, ...store.get().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX));
}

export function removeRecentSearch(term: string) {
  const t = term.trim().toLowerCase();
  const list = store.get();
  if (list.some((x) => x.toLowerCase() === t)) store.set(list.filter((x) => x.toLowerCase() !== t));
}

export function clearRecentSearches() {
  store.set([]);
}
