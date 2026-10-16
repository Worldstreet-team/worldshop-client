import type { Category, CategoryId, Listing, ListingStatus, ListingWithSeller, Review, SellerProfile } from "./types";

/*
 * Repository interfaces (PLAN §2.1). Server Components read through these; the
 * adapter behind them is chosen in lib/data/index.ts. Search, sort and radius live in
 * their own modules (S0.7–S0.9) and work over `listings.list()`.
 */

export type ListingFilter = {
  ids?: readonly string[];
  category_id?: CategoryId;
  seller_id?: string;
  /** Defaults to buyer-visible listings: live and reserved. */
  status?: readonly ListingStatus[];
};

export const BUYER_VISIBLE: readonly ListingStatus[] = ["live", "reserved"];

export interface ListingRepo {
  get(id: string): Promise<ListingWithSeller | null>;
  list(filter?: ListingFilter): Promise<ListingWithSeller[]>;
}

export interface SellerRepo {
  get(id: string): Promise<SellerProfile | null>;
  getByHandle(handle: string): Promise<SellerProfile | null>;
  list(): Promise<SellerProfile[]>;
}

export interface CategoryRepo {
  get(id: CategoryId): Promise<Category | null>;
  list(): Promise<Category[]>;
}

export interface ReviewRepo {
  /** Reviews of one listing, newest first (B3 step 7, "This item"). */
  forListing(listingId: string): Promise<Review[]>;
  /** Reviews across all of a seller's items, newest first ("All items from seller"). */
  forSeller(sellerId: string): Promise<Review[]>;
}

export interface SearchRepo {
  /** Popular searches for the empty search box (B2 step 1). */
  trending(): Promise<string[]>;
}

export type Repos = {
  listings: ListingRepo;
  sellers: SellerRepo;
  categories: CategoryRepo;
  reviews: ReviewRepo;
  search: SearchRepo;
};

/** `/listing/:id-:slug` (R-011). Ids never contain "-", so the first one splits. */
export function listingPath(listing: Pick<Listing, "id" | "slug">) {
  return `/listing/${listing.id}-${listing.slug}`;
}

export function parseListingParam(param: string): { id: string; slug: string } | null {
  const match = /^([A-Za-z0-9]+)(?:-(.*))?$/.exec(param);
  return match ? { id: match[1], slug: match[2] ?? "" } : null;
}
