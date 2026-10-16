import type { Notice } from "@ws/features/notifications/store";
import type { ListingStatus } from "@ws/lib/data/types";
import { formatCurrency, kobo } from "@ws/lib/money";

/*
 * Alerts (flows B4 step 4): opt-in per saved item (price drop, back in stock) or saved
 * search (new matching listings). Each alert keeps the last value it told the buyer
 * about, so a change fires once and the next change fires again. Notice ids carry the
 * new value, so re-running a check never duplicates a notice.
 */

export type ItemAlert = { id: string; price_drop: boolean; back_in_stock: boolean; last_price: number; last_status: ListingStatus };
export type SearchAlert = { href: string; label: string; last_total: number };
export type AlertsState = { items: ItemAlert[]; searches: SearchAlert[] };
export const emptyAlerts: AlertsState = { items: [], searches: [] };
export type ListingNow = { id: string; title: string; href: string; price_minor: number; status: ListingStatus };

const AVAILABLE: readonly ListingStatus[] = ["live"];

export function setItemAlert(state: AlertsState, now: Omit<ListingNow, "title" | "href">, kind: "price_drop" | "back_in_stock", on: boolean): AlertsState {
  const old = state.items.find((a) => a.id === now.id);
  const next: ItemAlert = { id: now.id, price_drop: old?.price_drop ?? false, back_in_stock: old?.back_in_stock ?? false, last_price: now.price_minor, last_status: now.status, [kind]: on };
  const items = state.items.filter((a) => a.id !== now.id);
  return { ...state, items: next.price_drop || next.back_in_stock ? [...items, next] : items };
}

export function setSearchAlert(state: AlertsState, href: string, label: string, on: boolean, total: number): AlertsState {
  const searches = state.searches.filter((s) => s.href !== href);
  return { ...state, searches: on ? [...searches, { href, label, last_total: total }] : searches };
}

export function checkItems(state: AlertsState, listings: readonly ListingNow[], at: string): { state: AlertsState; notices: Notice[] } {
  const notices: Notice[] = [];
  const items = state.items.map((a) => {
    const l = listings.find((x) => x.id === a.id);
    if (!l) return a;
    if (a.price_drop && l.price_minor < a.last_price) notices.push({ id: `alert:price:${a.id}:${l.price_minor}`, title: `Price dropped: ${l.title}`, body: `Now ${formatCurrency(kobo(l.price_minor))}, ${formatCurrency(kobo(a.last_price - l.price_minor))} less than before.`, href: l.href, at, read: false });
    if (a.back_in_stock && !AVAILABLE.includes(a.last_status) && AVAILABLE.includes(l.status)) notices.push({ id: `alert:stock:${a.id}:${at}`, title: `Back in stock: ${l.title}`, body: `Available again at ${formatCurrency(kobo(l.price_minor))}.`, href: l.href, at, read: false });
    return l.price_minor === a.last_price && l.status === a.last_status ? a : { ...a, last_price: l.price_minor, last_status: l.status };
  });
  return { state: items.every((a, i) => a === state.items[i]) ? state : { ...state, items }, notices };
}

export function checkSearches(state: AlertsState, totals: Readonly<Record<string, number>>, at: string): { state: AlertsState; notices: Notice[] } {
  const notices: Notice[] = [];
  const searches = state.searches.map((s) => {
    const total = totals[s.href];
    if (total === undefined || total === s.last_total) return s;
    if (total > s.last_total) {
      const n = total - s.last_total;
      notices.push({ id: `alert:search:${s.href}:${total}`, title: `${n} new listing${n === 1 ? "" : "s"} for “${s.label}”`, href: s.href, at, read: false });
    }
    return { ...s, last_total: total };
  });
  return { state: searches.every((s, i) => s === state.searches[i]) ? state : { ...state, searches }, notices };
}

const STATUSES: readonly ListingStatus[] = ["draft", "in_review", "live", "rejected", "paused", "reserved", "sold", "ended", "removed"];
export function parseAlerts(raw: unknown): AlertsState {
  const r = raw as AlertsState;
  if (typeof raw !== "object" || raw === null || !Array.isArray(r.items) || !Array.isArray(r.searches)) throw new Error("Invalid alerts");
  const ok = r.items.every((a) => typeof a.id === "string" && typeof a.price_drop === "boolean" && typeof a.back_in_stock === "boolean" && Number.isSafeInteger(a.last_price) && STATUSES.includes(a.last_status))
    && r.searches.every((s) => typeof s.href === "string" && s.href.startsWith("/search") && typeof s.label === "string" && Number.isSafeInteger(s.last_total));
  if (!ok) throw new Error("Invalid alerts");
  return r;
}
