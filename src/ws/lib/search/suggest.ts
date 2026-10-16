import { rules } from "@ws/config/marketplace-rules";
import type { Category, CategoryId, ListingWithSeller, SellerProfile } from "@ws/lib/data/types";
import { listingPath } from "@ws/lib/data/repo";
import { matchListings, parseQuery } from "./query";
import { suggestionMatch, words } from "./words";

/*
 * Live search suggestions (flows B2 step 2, spec SearchSuggestPanel): query
 * completions, "{query} in {category}" scopes, sellers and listing titles, matched
 * the same way results are, at most `rules.search.maxSuggestions` rows. No counts:
 * they'd be nationwide while results default to the buyer's radius (R-016). A
 * prohibited query gets nothing (EC-004).
 */

export type Suggestion =
  | { kind: "query"; text: string }
  | { kind: "category"; text: string; cat: CategoryId; name: string }
  | { kind: "seller"; text: string; href: string }
  | { kind: "listing"; text: string; href: string };

type Input = {
  typed: string;
  listings: readonly ListingWithSeller[];
  categories: readonly Category[];
  sellers: readonly SellerProfile[];
  trending?: readonly string[];
  max?: number;
};

const CAPS = { query: 4, category: 2, seller: 2, listing: 3 } as const;

export function suggest({ typed, listings, categories, sellers, trending = [], max = rules.search.maxSuggestions }: Input): Suggestion[] {
  const raw = typed.trim();
  if (raw.length < rules.search.minChars) return [];
  const parsed = parseQuery(raw);
  if (parsed.kind === "prohibited" || parsed.kind === "browse") return [];
  if (parsed.kind === "listing-id") {
    const hit = listings.find((l) => l.id === parsed.id);
    return hit ? [{ kind: "listing", text: hit.title, href: listingPath(hit) }] : [];
  }

  const scores = matchListings(listings, parsed.tokens, raw);
  const matched = listings.filter((l) => scores.has(l.id)).sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || a.id.localeCompare(b.id));
  const lower = raw.toLowerCase();

  // Completions: popular searches and the opening words of matching titles, longer
  // than what's typed, most common first.
  const counts = new Map<string, number>();
  const add = (phrase: string, weight: number) => {
    const p = phrase.toLowerCase().trim();
    if (p.length <= lower.length || p === lower || !suggestionMatch(p, raw)) return;
    counts.set(p, (counts.get(p) ?? 0) + weight);
  };
  trending.forEach((t) => add(t, 3));
  for (const l of matched) {
    const w = words(l.title);
    for (let n = 1; n <= 3 && n <= w.length; n++) add(w.slice(0, n).join(" "), 1);
    const brand = l.attributes.find((a) => a.key === "Brand")?.value;
    if (brand) add(`${brand} ${w.find((x) => x.startsWith(parsed.tokens.at(-1)!)) ?? ""}`, 1);
  }
  const queries: Suggestion[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))
    .slice(0, CAPS.query)
    .map(([text]) => ({ kind: "query", text }));

  const byCategory = new Map<CategoryId, number>();
  matched.forEach((l) => byCategory.set(l.category_id, (byCategory.get(l.category_id) ?? 0) + 1));
  const scopes: Suggestion[] = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, CAPS.category)
    .flatMap(([cat]) => {
      const c = categories.find((x) => x.id === cat);
      return c ? [{ kind: "category" as const, text: raw, cat, name: c.name }] : [];
    });

  const shops: Suggestion[] = sellers
    .filter((s) => suggestionMatch(s.shop_name, raw))
    .slice(0, CAPS.seller)
    .map((s) => ({ kind: "seller", text: s.shop_name, href: `/seller/${s.handle}` }));

  const titles: Suggestion[] = matched.slice(0, CAPS.listing).map((l) => ({ kind: "listing", text: l.title, href: listingPath(l) }));

  return [...queries, ...scopes, ...shops, ...titles].slice(0, max);
}
