import { rules } from "@ws/config/marketplace-rules";
import { CONDITION_LABELS } from "@ws/lib/condition";
import type { CategoryId, Condition, ListingWithSeller } from "@ws/lib/data/types";
import { deliveryEstimate, summariseDelivery } from "@ws/lib/delivery";
import { toMinor, type Kobo } from "@ws/lib/money";
import { first, type SearchParams } from "./params";

/*
 * Search filters (flows B2 "Filters (v1)", spec §6), all in the URL (R-011):
 *   ?cat=phones  ?min=&max= (whole naira)  ?cond=new,used  ?fmt=buy_now,offers
 *   ?del=free,pickup,fast  ?seller=verified,top_rated  ?within=7
 * Values inside a group are OR ("Brand new or Like new"); groups are AND. Anything
 * invalid is ignored, never an error. Delivery depends on the buyer's city (what
 * reaches them), so applying filters takes that context.
 */

export type FormatValue = "buy_now" | "offers";
export type DeliveryValue = "free" | "pickup" | "fast";
export type SellerValue = "verified" | "top_rated";
export type WithinValue = (typeof rules.search.listedWithinDays)[number];

export type Filters = {
  cat?: CategoryId;
  min?: Kobo;
  max?: Kobo;
  cond?: Condition[];
  fmt?: FormatValue[];
  del?: DeliveryValue[];
  seller?: SellerValue[];
  within?: WithinValue;
};

/** Filter groups as the buyer sees them (one chip and one "remove" each). */
export type FilterKey = "cat" | "price" | "cond" | "fmt" | "del" | "seller" | "within";

export type FilterContext = { city?: string; now?: number };

type Multi = "cond" | "fmt" | "del" | "seller";

/** The checkbox groups: their options in display order, labels and tests. */
export const MULTI_GROUPS: { key: Multi; label: string; options: { value: string; label: string }[] }[] = [
  { key: "cond", label: "Condition", options: (Object.keys(CONDITION_LABELS) as Condition[]).map((c) => ({ value: c, label: CONDITION_LABELS[c] })) },
  {
    key: "fmt",
    label: "Buying format",
    options: [
      { value: "buy_now", label: "Fixed price" },
      { value: "offers", label: "Accepts offers" },
    ],
  },
  {
    key: "del",
    label: "Delivery",
    options: [
      { value: "free", label: "Free delivery" },
      { value: "pickup", label: "Local pickup" },
      { value: "fast", label: `Arrives within ${rules.search.fastDeliveryDays} days` },
    ],
  },
  {
    key: "seller",
    label: "Seller",
    options: [
      { value: "verified", label: "Verified ID" },
      { value: "top_rated", label: "Top rated" },
    ],
  },
];

export const WITHIN_OPTIONS = rules.search.listedWithinDays.map((d) => ({ value: d, label: d === 1 ? "Last 24 hours" : `Last ${d} days` }));

const DAY = 86_400_000;

function test(key: Multi, value: string, l: ListingWithSeller, ctx: FilterContext): boolean {
  switch (key) {
    case "cond":
      return l.condition === value;
    case "fmt":
      return value === "offers" ? l.offers_enabled : l.format === "buy_now";
    case "seller":
      return value === "verified" ? l.seller.verified : l.seller.top_rated;
    case "del": {
      const s = summariseDelivery(l.delivery, ctx.city === undefined ? undefined : ctx.city === l.location.city);
      if (value === "pickup") return s.kind === "pickup" || ("pickup" in s && s.pickup);
      if (value === "free") return s.kind === "free";
      return (s.kind === "free" || s.kind === "paid") && deliveryEstimate(s.option)[1] <= rules.search.fastDeliveryDays;
    }
  }
}

/** Does a listing pass every filter (except the groups in `skip`)? */
export function passes(l: ListingWithSeller, f: Filters, ctx: FilterContext = {}, skip?: FilterKey): boolean {
  if (skip !== "cat" && f.cat && l.category_id !== f.cat) return false;
  if (skip !== "price" && f.min !== undefined && l.price_minor < f.min) return false;
  if (skip !== "price" && f.max !== undefined && l.price_minor > f.max) return false;
  for (const { key } of MULTI_GROUPS) {
    const values = f[key];
    if (skip === key || !values?.length) continue;
    if (!values.some((v) => test(key, v, l, ctx))) return false;
  }
  if (skip !== "within" && f.within !== undefined && Date.parse(l.created_at) < (ctx.now ?? Date.now()) - f.within * DAY) return false;
  return true;
}

export function applyFilters(listings: readonly ListingWithSeller[], f: Filters, ctx: FilterContext = {}): ListingWithSeller[] {
  return listings.filter((l) => passes(l, f, ctx));
}

/**
 * Counts beside each option (FacetCheckbox, CategoryTree): how many results that
 * option would give with every other filter as it is. `listings` should already be
 * matched to the query and limited to the radius, so counts agree with results (R-016).
 */
export function facetCounts(listings: readonly ListingWithSeller[], f: Filters, ctx: FilterContext = {}) {
  const groups = new Map<FilterKey, Map<string, number>>();
  const count = (key: FilterKey, value: (l: ListingWithSeller) => string[]) => {
    const m = new Map<string, number>();
    for (const l of listings) if (passes(l, f, ctx, key)) for (const v of value(l)) m.set(v, (m.get(v) ?? 0) + 1);
    groups.set(key, m);
  };
  count("cat", (l) => [l.category_id]);
  for (const g of MULTI_GROUPS) count(g.key, (l) => g.options.filter((o) => test(g.key, o.value, l, ctx)).map((o) => o.value));
  const now = ctx.now ?? Date.now();
  count("within", (l) => WITHIN_OPTIONS.filter((o) => Date.parse(l.created_at) >= now - o.value * DAY).map((o) => String(o.value)));
  return groups;
}

const naira = (v: string | undefined) => {
  if (!v || !/^\d{1,10}$/.test(v)) return undefined;
  return toMinor(Number(v));
};

/** A group's values from `?cond=new,used` (links) or `?cond=new&cond=used` (the filter form). */
const list = <T extends string>(v: string | string[] | undefined, allowed: readonly T[]) => {
  const raw = (Array.isArray(v) ? v : [v ?? ""]).flatMap((x) => x.split(","));
  const values = [...new Set(raw.filter((x): x is T => (allowed as readonly string[]).includes(x)))];
  return values.length ? values : undefined;
};

export function parseFilters(params: SearchParams, categories: readonly CategoryId[]): Filters {
  const cat = first(params.cat);
  let min = naira(first(params.min));
  let max = naira(first(params.max));
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  const within = Number(first(params.within));
  const groups = Object.fromEntries(
    MULTI_GROUPS.map((g) => [g.key, list(params[g.key], g.options.map((o) => o.value))]).filter(([, v]) => v),
  ) as Pick<Filters, Multi>;
  return {
    ...(cat && (categories as readonly string[]).includes(cat) && { cat: cat as CategoryId }),
    ...(min !== undefined && { min }),
    ...(max !== undefined && { max }),
    ...groups,
    ...((rules.search.listedWithinDays as readonly number[]).includes(within) && { within: within as WithinValue }),
  };
}

/** Active filter groups, in display order: each is one removable chip (price covers min and max). */
export function activeFilterKeys(f: Filters): FilterKey[] {
  const keys: FilterKey[] = [];
  if (f.cat) keys.push("cat");
  if (f.min !== undefined || f.max !== undefined) keys.push("price");
  for (const g of MULTI_GROUPS) if (f[g.key]?.length) keys.push(g.key);
  if (f.within !== undefined) keys.push("within");
  return keys;
}

export function withoutFilter(f: Filters, key: FilterKey): Filters {
  const next = { ...f };
  if (key === "price") {
    delete next.min;
    delete next.max;
  } else delete next[key];
  return next;
}

/** The URL params a filter group owns (price owns two). */
export const filterParams = (key: FilterKey) => (key === "price" ? ["min", "max"] : [key]);
