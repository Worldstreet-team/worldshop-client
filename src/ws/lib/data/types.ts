import type { LatLng } from "@ws/lib/geo";
import type { Kobo } from "@ws/lib/money";

/*
 * Data model, flows Part G (minimum viable). Field names follow Part G (snake_case,
 * `*_minor` for money) so the shapes match the eventual API. All money is integer
 * kobo in NGN; there is deliberately no currency field (R-002, EC-028).
 */

export type ISODateTime = string; // UTC (R-006)

/** A department's slug. The live catalogue sets these, so they are open strings. */
export type CategoryId = string;

export type Category = {
  id: CategoryId;
  name: string;
  /** Escrow inspection window key in config (L4). */
  inspection: "fashion" | "home" | "electronics" | "phones" | "appliances" | "furniture" | "vehicles" | "property" | "default";
  /** Vehicles and property: contact + "Book viewing", no escrow (PLAN risk 7). */
  kind: "goods" | "vehicle" | "property";
  /** Attribute keys worth a place on the card's subtitle line, most useful first. */
  card_facts?: readonly string[];
};

/** spec §5.3 ConditionChip; flows B2 condition filter. */
export type Condition = "new" | "like_new" | "refurbished" | "used" | "for_parts";

/** spec §5.3 FormatChip. Auctions stay behind `rules.flags.auctions`. */
export type ListingFormat = "buy_now" | "best_offer" | "auction";

/** flows §6.1 listing state machine. */
export type ListingStatus = "draft" | "in_review" | "live" | "rejected" | "paused" | "reserved" | "sold" | "ended" | "removed";

/** flows B4/S2 step 5. */
export type DeliveryMethod = "rider" | "pickup_station" | "meet_up" | "courier";

export type DeliveryOption = {
  method: DeliveryMethod;
  /** 0 = free. Mock flat fee by zone until a quote provider exists (PLAN risk 1). */
  fee_minor: Kobo;
  /** Business days after dispatch, inclusive range. */
  eta_days: readonly [number, number];
  /** Riders and meet-ups only work inside the seller's city; couriers go nationwide. */
  coverage: "same_city" | "nationwide";
};

export type Place = LatLng & {
  /** Area or neighbourhood shown to buyers ("Lekki Phase 1"). Never a street address. */
  area: string;
  city: string;
  state: string;
  /**
   * False when the API's city and state could not be placed (see places.ts): the
   * point is a stand-in, so no distance is shown from it.
   */
  known?: boolean;
};

/** L4 seller tiers drive payout delay; K3 levels gate limits. */
export type SellerLevel = "new" | "standard" | "trusted";

export type SellerProfile = {
  id: string;
  handle: string;
  shop_name: string;
  area: Place;
  level: SellerLevel;
  verified: boolean;
  top_rated: boolean;
  /** Seller feedback, kept apart from item ratings (audit F13, R-073). */
  feedback: { positive_percent: number; count: number };
  /** "Usually replies within 2 hours" (B5). */
  reply_hours?: number;
  /** The shop's own logo, where it has one. */
  logo?: string;
  joined_at: ISODateTime;
  /** Show the watcher count publicly once over the threshold (R-025). */
  show_watchers: boolean;
};

/** What a review talks about, for eBay-style topic chips (B3 step 7). */
export type ReviewTopic = "as_described" | "quality" | "value" | "delivery" | "communication" | "packaging";

/** The four detailed seller ratings (B11, eBay "Detailed seller ratings"). 1–5 each. */
export type ReviewDimensions = { accuracy: number; delivery: number; communication: number; packaging: number };

/**
 * One buyer's review of one order item (flows Part G Review, B11). Only buyers with a
 * completed order can write one (R-070), so every review is a verified purchase. The
 * buyer is shown masked ("o***a"), never by name. Item scores and seller scores are
 * summarised separately (R-073).
 */
export type Review = {
  id: string;
  listing_id: string;
  seller_id: string;
  /** Masked buyer name, e.g. "o***a" (B3 step 7). */
  buyer: string;
  /** The reviewer's own feedback count, shown in brackets as eBay does. Absent from the live API. */
  buyer_feedback_count?: number;
  rating: 1 | 2 | 3 | 4 | 5;
  /** The four detailed ratings. The live API collects one overall rating, so absent there. */
  dimensions?: ReviewDimensions;
  text: string;
  topics: readonly ReviewTopic[];
  created_at: ISODateTime;
  /** The seller may reply once (B11). */
  reply?: { text: string; created_at: ISODateTime };
};

/** One logged edit to a live listing (R-112), shown in "View history" (B3 step 5). */
export type ListingRevision =
  | { at: ISODateTime; change: "price"; from_minor: Kobo; to_minor: Kobo }
  | { at: ISODateTime; change: "description" | "photos" | "quantity" };

export type ListingMedia = {
  url: string;
  alt: string;
  order: number;
  type: "image" | "video";
  width: number;
  height: number;
};

export type ListingAttribute = { key: string; value: string };

export type Listing = {
  id: string;
  slug: string;
  seller_id: string;
  category_id: CategoryId;
  title: string;
  description: string;
  /** Absent for listings the seller gave no condition (services, property). */
  condition?: Condition;
  price_minor: Kobo;
  /**
   * The live API's three price kinds: a fixed price, a range from price_minor to
   * max_price_minor, or none at all ("Contact for price"; price_minor is then 0).
   */
  price_kind?: "fixed" | "range" | "on_request";
  max_price_minor?: Kobo;
  /** Rent and stays: what the price covers ("₦1,800,000 per year"). Absent = one-off price. */
  price_period?: "night" | "month" | "year";
  /** Strike-through price. Only allowed after ≥ 7 days at the higher price (S2 step 4). */
  was_minor?: Kobo;
  qty: number;
  format: ListingFormat;
  offers_enabled: boolean;
  auto_accept_minor?: Kobo;
  auto_decline_minor?: Kobo;
  location: Place;
  delivery: readonly DeliveryOption[];
  /** Days, or null for no returns (S2 step 6). */
  return_days: 3 | 7 | 14 | null;
  /** The seller's own words on condition, flaws and what's included (spec §7 SellerNotes). */
  seller_notes?: string;
  /** Edits since listing, oldest first (R-112). */
  revisions?: readonly ListingRevision[];
  media: readonly ListingMedia[];
  attributes: readonly ListingAttribute[];
  status: ListingStatus;
  created_at: ISODateTime;
  /** Item rating, separate from seller feedback (audit F13). Absent = render nothing. */
  rating?: { average: number; count: number };
  /**
   * Social proof (spec §5.1 item 8). Optional on purpose: components render nothing
   * when a value is absent, so nothing is ever made up (PLAN F7).
   */
  sold_count?: number;
  watchers?: number;
};

/** A listing joined with what a card needs to render it. */
export type ListingWithSeller = Listing & { seller: SellerProfile; category: Category };
