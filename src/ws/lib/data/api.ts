import { categoryService } from "@/features/catalog/api";
import type { Category as ApiCategory } from "@/features/catalog/types";
import { marketplaceReviewService, type MarketplaceReview } from "@/features/reviews/api";
import { publicMarketplace, type Listing as ApiListing, type PublicStore } from "@/features/stores/api";
import { isVerifiedTier } from "@/features/stores/model";
import { kobo } from "@ws/lib/money";
import { locate } from "./places";
import { BUYER_VISIBLE, type ListingFilter, type Repos } from "./repo";
import type { Category, Condition, ListingMedia, ListingStatus, ListingWithSeller, Place, Review, SellerProfile } from "./types";

/*
 * The WorldStore UI's repositories over the live marketplace API. The UI reads
 * everything through `repos` (lib/data/repo.ts); this file is the adapter it was
 * designed to have swapped in, turning the API's records into its shapes.
 *
 * Search, sort, radius and facets run over `listings.list()` in the browser, as they
 * do in the reference. The list is every published listing, fetched in pages of the
 * API's maximum and cached briefly. That is fine at today's catalogue size; past a
 * few thousand listings search should move to the server.
 */

const PAGE = 50;
const MAX_PAGES = 40;
const LISTINGS_TTL = 60_000;
const SLOW_TTL = 5 * 60_000;

export type Row = ApiListing & { store: PublicStore };

/** One promise per key, reused until it expires, so a page's parallel reads share a fetch. */
function cached<T>(ttl: number, load: () => Promise<T>) {
  let entry: { at: number; value: Promise<T> } | null = null;
  return () => {
    if (!entry || Date.now() - entry.at > ttl) {
      const value = load();
      entry = { at: Date.now(), value };
      value.catch(() => {
        entry = null;
      });
    }
    return entry.value;
  };
}

async function allPages<T>(fetchPage: (page: number) => Promise<{ data: T[]; pagination: { totalPages: number } }>): Promise<T[]> {
  const first = await fetchPage(1);
  const pages = Math.min(first.pagination.totalPages ?? 1, MAX_PAGES);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => fetchPage(i + 2)));
  return [first, ...rest].flatMap((p) => p.data);
}

// ─── Categories ────────────────────────────────────────────────────────────

const loadCategoryTree = cached(SLOW_TTL, () => categoryService.getCategories());

// Whole words of the slug: "personal-care" must not read as "car".
const VEHICLE = /(^|-)(vehicles?|cars?|autos?|automobiles?|motors?|motorcycles?)(-|$)/;
const PROPERTY = /(^|-)(property|properties|real|estate|land|houses?|rentals?|apartments?)(-|$)/;

/** The reference's escrow inspection windows are keyed by a handful of names. */
function inspectionFor(slug: string): Category["inspection"] {
  if (/phone|tablet/.test(slug)) return "phones";
  if (/electronic|computer|laptop|gadget/.test(slug)) return "electronics";
  if (/fashion|cloth|wear|shoe|bag/.test(slug)) return "fashion";
  if (/appliance/.test(slug)) return "appliances";
  if (/furniture/.test(slug)) return "furniture";
  if (/home|kitchen/.test(slug)) return "home";
  if (VEHICLE.test(slug)) return "vehicles";
  if (PROPERTY.test(slug)) return "property";
  return "default";
}

function toCategory(c: ApiCategory): Category {
  const kind = VEHICLE.test(c.slug) ? "vehicle" : PROPERTY.test(c.slug) ? "property" : "goods";
  return { id: c.slug, name: c.name, inspection: inspectionFor(c.slug), kind };
}

/**
 * The UI works in one level of categories. The API files listings under a leaf two
 * levels down, so each listing is shown under its department, and the departments are
 * the category list.
 */
async function departments() {
  const tree = await loadCategoryTree();
  const byId = new Map(tree.map((c) => [c.id, c]));
  const top = (id: string | null | undefined): ApiCategory | undefined => {
    let c = id ? byId.get(id) : undefined;
    while (c?.parentId && byId.get(c.parentId)) c = byId.get(c.parentId);
    return c;
  };
  const list = tree.filter((c) => !c.parentId && c.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder).map(toCategory);
  return { list, top };
}

// ─── Sellers ───────────────────────────────────────────────────────────────

const DAY = 86_400_000;

function toPlace(city: string | null | undefined, state: string | null | undefined): Place {
  const at = locate(city, state);
  return { lat: at.lat, lng: at.lng, area: at.area, city: at.city, state: at.state, known: at.known };
}

function toSeller(s: PublicStore): SellerProfile {
  const joined = s.createdAt && !Number.isNaN(Date.parse(s.createdAt)) ? s.createdAt : null;
  const age = joined ? Date.now() - Date.parse(joined) : 0;
  return {
    id: s.id,
    handle: s.slug,
    shop_name: s.name,
    area: toPlace(s.city, s.state),
    level: s.verificationTier === "PREMIUM" ? "trusted" : age > 90 * DAY && s.reviewCount >= 10 ? "standard" : "new",
    verified: isVerifiedTier(s.verificationTier),
    top_rated: Boolean(s.badges?.includes("TOP_RATED")),
    // The API keeps an average star rating, not a positive share; a rating's share of
    // the five-star scale is the nearest honest reading of "% positive".
    feedback: { positive_percent: s.reviewCount > 0 ? Math.round((s.avgRating / 5) * 100) : 0, count: s.reviewCount },
    reply_hours: s.avgResponseMins != null ? Math.max(1, Math.ceil(s.avgResponseMins / 60)) : undefined,
    // The store embedded in a listing carries no createdAt; loadListings swaps in the
    // directory's full record, and this epoch stand-in only survives if that fails.
    joined_at: joined ?? new Date(0).toISOString(),
    show_watchers: false,
    logo: s.logo ?? undefined,
  };
}

const loadStores = cached(SLOW_TTL, () => allPages((page) => publicMarketplace.browseStores({ page, limit: PAGE })).then((rows) => rows.map(toSeller)));

// ─── Listings ──────────────────────────────────────────────────────────────

const CONDITION: Record<string, Condition> = { NEW: "new", USED: "used", REFURBISHED: "refurbished", LIKE_NEW: "like_new", FOR_PARTS: "for_parts" };

const STATUS: Record<string, ListingStatus> = { PUBLISHED: "live", DRAFT: "draft", HIDDEN: "paused", REMOVED: "removed" };

type ImageRef = { url?: string; key?: string; alt?: string; width?: number; height?: number };

function toMedia(images: unknown[], title: string): ListingMedia[] {
  return (images as ImageRef[])
    .map((img) => String(img.url || img.key || ""))
    .filter(Boolean)
    .map((url, order) => ({ url, alt: order === 0 ? title : `${title}, photo ${order + 1}`, order, type: "image" as const, width: 1200, height: 1200 }));
}

function toListing(row: Row, top: (id: string | null | undefined) => ApiCategory | undefined): ListingWithSeller {
  const dept = top(row.categoryId ?? row.category?.id);
  const category: Category = dept ? toCategory(dept) : { id: "other", name: row.category?.name ?? "Other", inspection: "default", kind: "goods" };
  const attributes = [
    ...(row.brand ? [{ key: "Brand", value: row.brand }] : []),
    ...(row.material ? [{ key: "Material", value: row.material }] : []),
    ...Object.entries(row.attributes ?? {}).map(([key, value]) => ({ key, value: String(value) })),
    ...(row.customFields ?? []).map((f) => ({ key: f.label, value: f.value })),
  ].filter((a, i, all) => all.findIndex((b) => b.key.toLowerCase() === a.key.toLowerCase()) === i);
  const price = row.priceType === "ON_REQUEST" ? 0 : (row.basePrice ?? 0);
  const was = row.compareAtPrice != null && row.compareAtPrice > price ? row.compareAtPrice : undefined;

  return {
    id: row.id,
    slug: row.slug,
    seller_id: row.store.id,
    category_id: category.id,
    title: row.name,
    description: row.description ?? "",
    condition: row.condition ? CONDITION[row.condition] : undefined,
    price_minor: kobo(Math.round(price * 100)),
    price_kind: row.priceType === "ON_REQUEST" ? "on_request" : row.priceType === "RANGE" ? "range" : "fixed",
    max_price_minor: row.priceType === "RANGE" && row.maxPrice != null ? kobo(Math.round(row.maxPrice * 100)) : undefined,
    was_minor: was !== undefined ? kobo(Math.round(was * 100)) : undefined,
    qty: row.stockLeft ?? 1,
    format: row.isNegotiable ? "best_offer" : "buy_now",
    offers_enabled: row.isNegotiable,
    location: toPlace(row.city, row.state),
    delivery: [],
    return_days: null,
    media: toMedia(row.images ?? [], row.name),
    attributes,
    status: STATUS[row.status] ?? "live",
    created_at: row.publishedAt ?? row.updatedAt,
    rating: row.reviewCount ? { average: row.avgRating ?? 0, count: row.reviewCount } : undefined,
    seller: toSeller(row.store),
    category,
  };
}

/** A listing being written in the sell wizard, as a buyer's card would show it. */
export function previewCard(row: Row, categoryName: string): ListingWithSeller {
  return { ...toListing(row, () => undefined), category: { id: "other", name: categoryName, inspection: "default", kind: "goods" } };
}

const loadListings = cached(LISTINGS_TTL, async () => {
  const [rows, { top }, stores] = await Promise.all([
    allPages((page) => publicMarketplace.browse({ page, limit: PAGE })),
    departments(),
    loadStores().catch(() => [] as SellerProfile[]),
  ]);
  // A listing's embedded store is a trimmed record (no join date, for one); the
  // directory has the whole shop, so it wins where both exist.
  const full = new Map(stores.map((s) => [s.id, s]));
  return rows.map((r) => {
    const listing = toListing(r as Row, top);
    const seller = full.get(listing.seller_id);
    return seller ? { ...listing, seller } : listing;
  });
});

function matches(l: ListingWithSeller, filter: ListingFilter) {
  if (filter.ids && !filter.ids.includes(l.id)) return false;
  if (filter.category_id && l.category_id !== filter.category_id) return false;
  if (filter.seller_id && l.seller_id !== filter.seller_id) return false;
  return (filter.status ?? BUYER_VISIBLE).includes(l.status);
}

// ─── Reviews ───────────────────────────────────────────────────────────────

/** "Amaka N." -> "a***a": the reference never shows a buyer's name. */
function mask(name: string) {
  const s = name.replace(/[^A-Za-z]/g, "").toLowerCase();
  return s.length < 2 ? "b***r" : `${s[0]}***${s[s.length - 1]}`;
}

function toReview(r: MarketplaceReview, sellerId: string): Review {
  return {
    id: r.id,
    listing_id: r.product?.id ?? "",
    seller_id: sellerId,
    buyer: mask(r.userName),
    rating: Math.min(5, Math.max(1, Math.round(r.rating))) as Review["rating"],
    text: [r.title, r.comment].filter(Boolean).join("\n\n"),
    topics: [],
    created_at: r.createdAt,
    reply: r.vendorReply ? { text: r.vendorReply, created_at: r.vendorRepliedAt ?? r.updatedAt } : undefined,
  };
}

// ─── Repos ─────────────────────────────────────────────────────────────────

export function createApiRepos(): Repos {
  const sellerById = async (id: string) => (await loadStores()).find((s) => s.id === id) ?? (await loadListings()).find((l) => l.seller_id === id)?.seller ?? null;

  return {
    listings: {
      async get(id) {
        const cachedRow = (await loadListings()).find((l) => l.id === id);
        if (cachedRow) return cachedRow;
        try {
          const [res, { top }, stores] = await Promise.all([publicMarketplace.getListing(id), departments(), loadStores().catch(() => [] as SellerProfile[])]);
          if (!res.data) return null;
          const listing = toListing(res.data as unknown as Row, top);
          const seller = stores.find((s) => s.id === listing.seller_id);
          return seller ? { ...listing, seller } : listing;
        } catch {
          return null;
        }
      },
      async list(filter = {}) {
        return (await loadListings()).filter((l) => matches(l, filter));
      },
    },
    sellers: {
      get: sellerById,
      async getByHandle(handle) {
        const known = (await loadStores()).find((s) => s.handle === handle);
        if (known) return known;
        try {
          const res = await publicMarketplace.getStore(handle);
          return res.data ? toSeller(res.data) : null;
        } catch {
          return null;
        }
      },
      list: loadStores,
    },
    categories: {
      async get(id) {
        return (await departments()).list.find((c) => c.id === id) ?? null;
      },
      async list() {
        return (await departments()).list;
      },
    },
    reviews: {
      async forListing(listingId) {
        const listing = await listingById(listingId);
        if (!listing) return [];
        const res = await marketplaceReviewService.forListing(listingId, { limit: 50 }).catch(() => null);
        return (res?.data ?? []).map((r) => toReview(r, listing.seller_id));
      },
      async forSeller(sellerId) {
        const seller = await sellerById(sellerId);
        if (!seller) return [];
        const res = await marketplaceReviewService.forStore(seller.handle, { limit: 50 }).catch(() => null);
        return (res?.data ?? []).map((r) => toReview(r, sellerId));
      },
    },
    search: {
      // No search analytics yet. The empty box shows nothing rather than made-up trends.
      async trending() {
        return [];
      },
    },
  };

  async function listingById(id: string) {
    return (await loadListings()).find((l) => l.id === id) ?? null;
  }
}
