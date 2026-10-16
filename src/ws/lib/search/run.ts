import { rules } from "@ws/config/marketplace-rules";
import type { ListingWithSeller } from "@ws/lib/data/types";
import type { LatLng } from "@ws/lib/geo";
import { activeFilterKeys, applyFilters, facetCounts, withoutFilter, type FilterContext, type Filters } from "./filters";
import { matchListings, type ParsedQuery } from "./query";
import { countsByRadius, filterByRadius, type Radius } from "./radius";
import { sortListings, type SortKey } from "./sort";

/*
 * One search, as the results page needs it: match → filters → radius → sort → page.
 * Also returns what ZeroResults suggests (B2): how many results each radius would
 * give, and how many each filter is costing.
 */

export type SearchInput = {
  listings: readonly ListingWithSeller[];
  query: Extract<ParsedQuery, { kind: "browse" | "text" }>;
  filters: Filters;
  anchor: LatLng;
  radius: Radius;
  sort: SortKey;
  /** 1-based; each page adds `rules.search.pageSize` results ("Show more"). */
  page: number;
  /** What the buyer hid ("Not interested", "Hide seller"): left out of results and counts. */
  hidden?: { listings: ReadonlySet<string>; sellers: ReadonlySet<string> };
  now?: number;
  /** The buyer's city, for delivery filters (what reaches them). */
  city?: string;
};

export function runSearch({ listings: all, query, filters, anchor, radius, sort, page, hidden, now, city }: SearchInput) {
  const ctx: FilterContext = { city, now };
  const listings = hidden ? all.filter((l) => !hidden.listings.has(l.id) && !hidden.sellers.has(l.seller_id)) : all;
  const relevance = query.kind === "text" ? matchListings(listings, query.tokens, query.raw) : undefined;
  const matched = relevance ? listings.filter((l) => relevance.has(l.id)) : listings;
  const filtered = applyFilters(matched, filters, ctx);
  const inRadius = filterByRadius(filtered, anchor, radius);
  const sorted = sortListings(inRadius, sort, { anchor, relevance, now, city });
  const shown = sorted.slice(0, rules.search.pageSize * Math.max(1, page));

  return {
    total: sorted.length,
    shown,
    radiusCounts: countsByRadius(filtered, anchor),
    filterCounts: new Map(activeFilterKeys(filters).map((k) => [k, filterByRadius(applyFilters(matched, withoutFilter(filters, k), ctx), anchor, radius).length])),
    /** Counts for every filter option, inside the radius (R-016). */
    facets: facetCounts(filterByRadius(matched, anchor, radius), filters, ctx),
  };
}

export function parsePage(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 50 ? n : 1;
}
