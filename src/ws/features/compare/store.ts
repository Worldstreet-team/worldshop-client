"use client";
import { useSyncExternalStore } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { createLocalStore } from "@ws/lib/local-store";

/* CompareTray selection (spec §270): up to 4 listing ids, oldest first, on this device. */
const store = createLocalStore<readonly string[]>("ws:compare", [], (raw) =>
  Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9]{1,20}$/.test(id)).slice(0, rules.compare.max) : [],
);
export function useCompare() { return useSyncExternalStore(store.subscribe, store.get, () => store.initial); }
/** "full" leaves the tray as it is: nothing is dropped to make room. */
export function toggleCompare(id: string): "added" | "removed" | "full" {
  const ids = store.get();
  if (ids.includes(id)) { store.set(ids.filter((x) => x !== id)); return "removed"; }
  if (ids.length >= rules.compare.max) return "full";
  store.set([...ids, id]);
  return "added";
}
export function clearCompare() { store.set([]); }
export { compareHref } from "./href";
