import { useSyncExternalStore } from "react";

/* The last search that hit the prohibited list (EC-004). The results page reports it;
   the header's search box then shows no suggestions for it and forgets it. In memory
   only: it matters for the page being viewed, nothing more. */
let term: string | null = null;
const listeners = new Set<() => void>();

export function setProhibited(next: string | null) {
  if (next === term) return;
  term = next;
  listeners.forEach((l) => l());
}

export function useProhibited() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => term,
    () => null,
  );
}
