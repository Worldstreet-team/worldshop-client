import { rules } from "@ws/config/marketplace-rules";
import type { Category, ListingWithSeller } from "@ws/lib/data/types";
import type { LatLng } from "@ws/lib/geo";
import { discountPercent } from "@ws/lib/money";
import { filterByRadius, type Radius } from "@ws/lib/search/radius";
import { runSearch } from "@ws/lib/search/run";
import { sortListings } from "@ws/lib/search/sort";

/*
 * What the home page shows (flows B1), worked out in one place so its rules are
 * unit-tested:
 * - Category counts are exactly what /search?cat= shows at the buyer's radius (R-016);
 *   a category with nothing nearby shows its nationwide count instead, labelled as
 *   such, and links to the nationwide results.
 * - A listing appears once per page (R-013). Each listing goes to its most specific
 *   rail first: a price drop to Deals, then the nearest to Near you, then the newest
 *   to "Just listed". The page still shows them in B1 order.
 * - A rail with fewer than `rules.home.minRailItems` collapses (R-014).
 * - With nothing near the buyer, one rail from across Nigeria takes Near you's place,
 *   labelled as nationwide (audit F6: never pass far items off as near).
 */

export type Hidden = { listings: ReadonlySet<string>; sellers: ReadonlySet<string> };

export type CategoryTile = {
  category: Category;
  count: number;
  /** "radius": within the buyer's radius; "nationwide": nothing in it, so everywhere. */
  scope: "radius" | "nationwide";
};

export type RailId = "recent" | "near" | "deals" | "new" | "nationwide";

export type Rail = {
  id: RailId;
  listings: ListingWithSeller[];
  /** How many listings the rail drew from, for "See all". */
  total: number;
};

type Input = {
  listings: readonly ListingWithSeller[];
  /** Recently viewed ids, newest first: that rail comes first and keeps its listings (B1, R-013). */
  recent?: readonly string[];
  categories: readonly Category[];
  anchor: LatLng;
  /** The buyer's radius (`?radius=`, R-001); defaults like /search. */
  radius?: Radius;
  hidden?: Hidden;
  now?: number;
};

const browse = { kind: "browse", raw: "" } as const;

/** What /search shows with no query: the number in "32 listings near Lagos". */
export function nearbyCount({ listings, anchor, radius = rules.location.defaultRadiusKm, hidden }: Omit<Input, "categories" | "now">) {
  return runSearch({ listings, query: browse, filters: {}, anchor, radius, sort: "best", page: 1, hidden }).total;
}

export function categoryTiles({ listings, categories, anchor, radius = rules.location.defaultRadiusKm, hidden }: Omit<Input, "now">): CategoryTile[] {
  return categories.map((category) => {
    const result = runSearch({
      listings,
      query: browse,
      filters: { cat: category.id },
      anchor,
      radius,
      sort: "best",
      page: 1,
      hidden,
    });
    return result.total > 0 || radius === null
      ? { category, count: result.total, scope: "radius" }
      : { category, count: result.radiusCounts.get(null) ?? 0, scope: "nationwide" };
  });
}

export function homeRails({ listings, anchor, radius = rules.location.defaultRadiusKm, hidden, now, recent = [] }: Omit<Input, "categories">): Record<RailId, Rail | null> {
  const { minRailItems, railMax, moreMax } = rules.home;
  const visible = hidden ? listings.filter((l) => !hidden.listings.has(l.id) && !hidden.sellers.has(l.seller_id)) : listings;
  const nearby = filterByRadius(visible, anchor, radius);
  const used = new Set<string>();

  const take = (id: RailId, pool: ListingWithSeller[], max: number): Rail | null => {
    const fresh = pool.filter((l) => !used.has(l.id));
    if (fresh.length < minRailItems) return null;
    const shown = fresh.slice(0, max);
    shown.forEach((l) => used.add(l.id));
    return { id, listings: shown, total: fresh.length };
  };

  // Recently viewed: wherever the listings are (it's the buyer's own history), newest first.
  const byId = new Map(visible.map((l) => [l.id, l]));
  const viewed = take("recent", recent.flatMap((id) => byId.get(id) ?? []), rules.home.recentlyViewedMax);
  const deals = take(
    "deals",
    sortListings(
      nearby.filter((l) => discountPercent(l.price_minor, l.was_minor) !== null),
      "discount",
      { anchor, now },
    ),
    railMax,
  );
  const near = take("near", sortListings(nearby, "nearest", { anchor, now }), railMax);
  const fresh = take("new", sortListings(nearby, "newest", { anchor, now }), moreMax);
  const nationwide = near ? null : take("nationwide", sortListings(visible, "best", { anchor, now }), railMax);
  return { recent: viewed, deals, near, new: fresh, nationwide };
}
