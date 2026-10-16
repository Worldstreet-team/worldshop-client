import { rules } from "@ws/config/marketplace-rules";
import type { ListingWithSeller } from "@ws/lib/data/types";
import { haversineKm, type LatLng } from "@ws/lib/geo";
import { deliveryFee, summariseDelivery } from "@ws/lib/delivery";
import { discountPercent } from "@ws/lib/money";

/*
 * Sort orders (flows B2 "Sort", spec §6 SortMenu), eBay's set minus auctions. Every
 * order works on canonical NGN kobo (R-002). The price sorts are eBay's "Price +
 * delivery": item price plus the cheapest way it reaches the buyer's city, the same
 * total the card shows (PLAN C10); pickup-only adds nothing, and a listing that can't
 * reach the buyer goes last. Ties break on id so a sort is deterministic, which keeps
 * paging and Back stable.
 */

export const SORTS = [
  { key: "best", label: "Best match" },
  { key: "price_asc", label: "Price + delivery: lowest first" },
  { key: "price_desc", label: "Price + delivery: highest first" },
  { key: "newest", label: "Newly listed" },
  { key: "nearest", label: "Distance: nearest first" },
  { key: "discount", label: "Biggest discount" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

export function parseSort(value: string | string[] | undefined): SortKey {
  const v = Array.isArray(value) ? value[0] : value;
  return SORTS.some((s) => s.key === v) ? (v as SortKey) : "best";
}

export function sortLabel(key: SortKey) {
  return SORTS.find((s) => s.key === key)!.label;
}

type Context = {
  anchor?: LatLng;
  /** The buyer's city, for the delivery part of "Price + delivery". */
  city?: string;
  /** Text relevance per listing id in [0, 1], from search (S0.9). Missing = 0.5. */
  relevance?: ReadonlyMap<string, number>;
  now?: number;
};

const DAY = 86_400_000;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Best match (flows B2 initial formula): text relevance 0.40 + seller quality 0.20 +
 * freshness 0.10 + price competitiveness for the category 0.10 + completeness 0.10 +
 * distance 0.10. Each part is scaled to [0, 1].
 */
export function bestMatchScores(listings: readonly ListingWithSeller[], { anchor, relevance, now = Date.now() }: Context = {}) {
  const pricesByCategory = new Map<string, number[]>();
  for (const l of listings) {
    const prices = pricesByCategory.get(l.category_id) ?? [];
    prices.push(l.price_minor);
    pricesByCategory.set(l.category_id, prices);
  }
  const medians = new Map<string, number>();
  for (const [cat, prices] of pricesByCategory) {
    prices.sort((a, b) => a - b);
    medians.set(cat, prices[Math.floor(prices.length / 2)]);
  }

  const scores = new Map<string, number>();
  for (const l of listings) {
    const text = relevance?.get(l.id) ?? 0.5;
    const { positive_percent, count } = l.seller.feedback;
    // Feedback only counts once there's enough of it (rules.trust.newSellerFeedbackCount).
    const seller = (positive_percent / 100) * Math.min(1, count / rules.trust.newSellerFeedbackCount) + (l.seller.verified ? 0 : -0.1);
    const ageDays = (now - Date.parse(l.created_at)) / DAY;
    const fresh = 1 - clamp01(ageDays / 30);
    const median = medians.get(l.category_id)!;
    const price = clamp01(1 - (l.price_minor - median) / (median || 1) / 2);
    const complete = clamp01(l.media.length / 6) * 0.6 + (l.attributes.length > 0 ? 0.2 : 0) + (l.description.length > 80 ? 0.2 : 0);
    const near = anchor ? 1 - clamp01(haversineKm(anchor, l.location) / 50) : 0.5;
    scores.set(l.id, 0.4 * text + 0.2 * clamp01(seller) + 0.1 * fresh + 0.1 * price + 0.1 * complete + 0.1 * near);
  }
  return scores;
}

/** Item price plus delivery to the buyer's city; null when it can't reach them. */
export function totalTo(l: Pick<ListingWithSeller, "price_minor" | "delivery" | "location">, city?: string): number | null {
  const summary = summariseDelivery(l.delivery, city === undefined ? undefined : city === l.location.city);
  if (summary.kind === "none") return null;
  return l.price_minor + (deliveryFee(summary) ?? 0);
}

export function sortListings<T extends ListingWithSeller>(listings: readonly T[], key: SortKey, context: Context = {}): T[] {
  const byId = (a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const list = [...listings];
  switch (key) {
    case "price_asc":
    case "price_desc": {
      const dir = key === "price_asc" ? 1 : -1;
      const total = new Map(list.map((l) => [l.id, totalTo(l, context.city)]));
      return list.sort((a, b) => {
        const x = total.get(a.id)!;
        const y = total.get(b.id)!;
        if (x === null || y === null) return x === y ? byId(a, b) : x === null ? 1 : -1;
        return (x - y) * dir || byId(a, b);
      });
    }
    case "newest":
      return list.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || byId(a, b));
    case "nearest": {
      if (!context.anchor) return sortListings(list, "best", context);
      const km = new Map(list.map((l) => [l.id, haversineKm(context.anchor!, l.location)]));
      return list.sort((a, b) => km.get(a.id)! - km.get(b.id)! || byId(a, b));
    }
    case "discount": {
      const off = (l: T) => discountPercent(l.price_minor, l.was_minor) ?? -1;
      return list.sort((a, b) => off(b) - off(a) || byId(a, b));
    }
    case "best": {
      const scores = bestMatchScores(list, context);
      return list.sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || byId(a, b));
    }
  }
}
