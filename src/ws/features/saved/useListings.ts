"use client";

import { localFetch } from "@ws/compat/localApi";
import { useEffect, useState } from "react";
import type { ListingWithSeller } from "@ws/lib/data/types";

/** Listings for ids kept on the device. `null` while loading; missing ids were removed. */
export function useListings(ids: readonly string[]) {
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; items: ListingWithSeller[] } | null>(null);
  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    localFetch(`/api/listings?ids=${key}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { items: ListingWithSeller[] }) => setState({ key, items: d.items }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]);
  if (!key) return [] as ListingWithSeller[];
  return state?.key === key ? state.items : null;
}
