"use client";
import { localFetch } from "@ws/compat/localApi";
import { useEffect } from "react";
import { rules } from "@ws/config/marketplace-rules";
import { pushNotice } from "@ws/features/notifications/store";
import { listingPath } from "@ws/lib/data/repo";
import type { ListingWithSeller } from "@ws/lib/data/types";
import { checkItems, checkSearches } from "./model";
import { alertsNow, updateAlerts } from "./store";

/** Total for a saved search's results URL, from the same endpoint the filter sheet uses. */
export async function searchTotal(href: string, signal?: AbortSignal) {
  const query = href.split("?")[1] ?? "";
  const res = await localFetch(`/api/search-count?${query}`, { signal });
  return ((await res.json()) as { total: number }).total;
}

/* Checks alerts when a tab opens and every few minutes while it stays open. Production
   evaluates them on the server and sends push/email (R-012); this stands in for that. */
export function AlertsWatcher() {
  useEffect(() => {
    if (!rules.flags.alerts) return;
    const ctrl = new AbortController();
    const run = async () => {
      const state = alertsNow();
      const at = new Date().toISOString();
      try {
        if (state.items.length) {
          const res = await localFetch(`/api/listings?ids=${state.items.map((a) => a.id).join(",")}`, { signal: ctrl.signal, cache: "no-store" });
          const { items } = (await res.json()) as { items: ListingWithSeller[] };
          const result = checkItems(alertsNow(), items.map((l) => ({ id: l.id, title: l.title, href: listingPath(l), price_minor: l.price_minor, status: l.status })), at);
          result.notices.forEach(pushNotice);
          if (result.state !== alertsNow()) updateAlerts(() => result.state);
        }
        if (state.searches.length) {
          const totals = Object.fromEntries(await Promise.all(state.searches.map(async (s) => [s.href, await searchTotal(s.href, ctrl.signal)] as const)));
          const result = checkSearches(alertsNow(), totals, at);
          result.notices.forEach(pushNotice);
          if (result.state !== alertsNow()) updateAlerts(() => result.state);
        }
      } catch { /* offline or aborted: try again next time */ }
    };
    void run();
    const id = window.setInterval(run, rules.alerts.checkEveryMs);
    return () => { ctrl.abort(); window.clearInterval(id); };
  }, []);
  return null;
}
