import { rules } from "@ws/config/marketplace-rules";
import type { ListingWithSeller } from "@ws/lib/data/types";

/*
 * The card's subtitle facts (eBay item tile, Baymard category-specific attributes): the
 * category's most useful attributes, in its order, worded for a glance ("Battery 89%",
 * "8GB RAM", "2 bed"), skipping anything the title already says.
 */

const WORDING: Record<string, (v: string) => string> = {
  "Battery health": (v) => `Battery ${v}`,
  RAM: (v) => `${v} RAM`,
  Bedrooms: (v) => `${v} bed`,
  Bathrooms: (v) => `${v} bath`,
  Seats: (v) => `${v} seats`,
  Size: (v) => (/^\d/.test(v) ? v : `Size ${v}`),
};

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function cardFacts(listing: Pick<ListingWithSeller, "title" | "attributes" | "category">, max: number = rules.card.maxFacts): string[] {
  const keys = listing.category.card_facts ?? [];
  const title = squash(listing.title);
  const facts: string[] = [];
  for (const key of keys) {
    const value = listing.attributes.find((a) => a.key === key)?.value;
    if (!value) continue;
    const fact = (WORDING[key] ?? ((v: string) => v))(value);
    // Compare the worded fact, so "2 bed" is caught by "2-Bedroom" but "2 bath" isn't.
    if (title.includes(squash(fact)) || (squash(value).length >= 3 && title.includes(squash(value)))) continue;
    facts.push(fact);
    if (facts.length === max) break;
  }
  return facts;
}
