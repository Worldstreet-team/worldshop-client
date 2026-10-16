import { useSyncExternalStore } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { createLocalStore } from "@ws/lib/local-store";

/* Saved listings (B4). Kept in localStorage until accounts exist; the API matches what a
   server-backed store will need, so only this file changes then. Each entry keeps the
   price it was saved at, so Saved can say "Price dropped ₦X" (B4 step 3). Older entries
   were bare ids and still load. */

export type SavedEntry = { id: string; price_minor?: number; at?: string };

const saved = createLocalStore<readonly SavedEntry[]>("ws:saved", [], (raw) =>
  Array.isArray(raw)
    ? raw.flatMap((x): SavedEntry[] =>
        typeof x === "string" ? [{ id: x }] : typeof x === "object" && x !== null && typeof x.id === "string" ? [{ id: x.id, price_minor: typeof x.price_minor === "number" ? x.price_minor : undefined, at: typeof x.at === "string" ? x.at : undefined }] : [],
      )
    : [],
);

let ids: readonly string[] = [];
let idsFor: readonly SavedEntry[] | null = null;
const idsOf = (entries: readonly SavedEntry[]) => {
  if (entries !== idsFor) {
    idsFor = entries;
    ids = entries.map((e) => e.id);
  }
  return ids;
};

export function useSavedEntries() {
  return useSyncExternalStore(saved.subscribe, saved.get, () => saved.initial);
}

export function useSavedIds() {
  return useSyncExternalStore(
    saved.subscribe,
    () => idsOf(saved.get()),
    () => idsOf(saved.initial),
  );
}

export function useIsSaved(listingId: string) {
  return useSavedIds().includes(listingId);
}

/** "full" when the list is at its cap (R-027): nothing is dropped to make room. */
export function saveListing(listingId: string, price_minor?: number): "saved" | "already" | "full" {
  const entries = saved.get();
  if (entries.some((e) => e.id === listingId)) return "already";
  if (entries.length >= rules.saved.maxListings) return "full";
  saved.set([{ id: listingId, price_minor, at: new Date().toISOString() }, ...entries]);
  return "saved";
}

export function unsaveListing(listingId: string) {
  saved.set(saved.get().filter((e) => e.id !== listingId));
}
