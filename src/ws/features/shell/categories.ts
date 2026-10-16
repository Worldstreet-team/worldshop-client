import type { Category, ListingWithSeller } from "@ws/lib/data/types";
import { listingPath } from "@ws/lib/data/repo";
import { formatCurrency } from "@ws/lib/money";

/* What the category navigation needs, shaped on the server so the client menu gets
   small plain objects: each category with a few of its newest listings for the mega
   menu's preview. */

export type NavListing = { id: string; title: string; href: string; photo?: string; price: string };
export type NavCategory = { id: Category["id"]; name: string; listings: NavListing[] };

export function navCategories(categories: readonly Category[], listings: readonly ListingWithSeller[], perCategory = 4): NavCategory[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    listings: listings
      .filter((l) => l.category_id === c.id)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id))
      .slice(0, perCategory)
      .map((l) => ({ id: l.id, title: l.title, href: listingPath(l), photo: l.media[0]?.url, price: formatCurrency(l.price_minor) })),
  }));
}
