import { rules } from "@ws/config/marketplace-rules";
import type { Anchor } from "@ws/lib/areas";
import type { ListingWithSeller } from "@ws/lib/data/types";
import { haversineKm } from "@ws/lib/geo";

/* The listing page's two rails (spec §7 SimilarItemsRail, SellerOtherItemsRail; eBay
   "Similar items" and "Seller's other items"). Each listing shows once on the page
   (R-013): the seller's own items go in their rail, so Similar skips them. Hidden
   listings and sellers stay hidden here too. */

type Hidden = { listings: ReadonlySet<string>; sellers: ReadonlySet<string> };
type Input = { listing: ListingWithSeller; all: readonly ListingWithSeller[]; anchor: Anchor; hidden: Hidden };

const visible = (l: ListingWithSeller, { listing, hidden }: Input) => l.id !== listing.id && !hidden.listings.has(l.id) && !hidden.sellers.has(l.seller_id);

/** Same category from other sellers, closest in price first, then nearest to the buyer. */
export function similarListings(input: Input, limit = rules.listing.relatedRailMax): ListingWithSeller[] {
  const { listing, all, anchor } = input;
  const score = (l: ListingWithSeller) => Math.abs(Math.log(l.price_minor / listing.price_minor)) + haversineKm(anchor, l.location) / 100;
  const picks = all
    .filter((l) => visible(l, input) && l.category_id === listing.category_id && l.seller_id !== listing.seller_id)
    .sort((a, b) => score(a) - score(b))
    .slice(0, limit);
  // R-014: a rail with too few items collapses rather than looking empty.
  return picks.length >= rules.home.minRailItems ? picks : [];
}

/** The same seller's other live items, newest first. Shown even when there are only a
 *  few, because "what else does this shop sell" is useful at any size (spec §7). */
export function sellerOtherListings(input: Input, limit = rules.listing.relatedRailMax): ListingWithSeller[] {
  return input.all
    .filter((l) => visible(l, input) && l.seller_id === input.listing.seller_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}
