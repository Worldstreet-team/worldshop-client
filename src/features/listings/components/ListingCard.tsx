import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Camera, Clock, Heart, ImageOff, MapPin, Star } from "lucide-react";
import type { Listing, PublicStore } from "@/features/stores/api";
import {
  firstImage,
  imageSrc,
  priceLabel,
  timeAgo,
  type ImageRef,
} from "@/features/listings/model";
import { isVerifiedTier } from "@/features/stores/model";
import { savedListings, toggleSaved } from "@/features/listings/savedListings";
import { useListingPrefetch } from "@/features/listings/hooks/useListingPrefetch";
import { formatLocation } from "@/shared/utils/locations";

const CONDITION_LABEL: Record<string, string> = {
  NEW: "New",
  USED: "Used",
  REFURBISHED: "Refurbished",
};

const FRESH_MS = 3 * 24 * 60 * 60 * 1000;

export type CardListing = Pick<
  Listing,
  | "id"
  | "slug"
  | "name"
  | "condition"
  | "city"
  | "state"
  | "images"
  | "priceType"
  | "basePrice"
  | "maxPrice"
> &
  Partial<
    Pick<
      Listing,
      | "country"
      | "category"
      | "isNegotiable"
      | "publishedAt"
      | "avgRating"
      | "reviewCount"
      | "isFeatured"
      | "shortDesc"
    >
  >;

function isFresh(publishedAt?: string | null): boolean {
  if (!publishedAt) return false;
  const at = Date.parse(publishedAt);
  return Number.isFinite(at) && Date.now() - at < FRESH_MS;
}

export default function ListingCard({
  listing,
  showSeller = false,
}: {
  listing: CardListing & {
    store?: Pick<PublicStore, "name"> & Partial<PublicStore>;
  };
  showSeller?: boolean;
}) {
  const img = firstImage(listing);
  const images = (listing.images as ImageRef[]) ?? [];
  const hoverImg = images.length > 1 ? imageSrc(images[1]) : "";
  const location = formatLocation(
    [listing.city, listing.state],
    listing.country,
  );
  const condition = listing.condition
    ? (CONDITION_LABEL[listing.condition] ?? listing.condition)
    : null;
  const onRequest = priceLabel(listing) === "Contact for price";
  // Featured is a plain white chip in the design, not a coloured one: it marks
  // placement, while the coloured fills are reserved for things about the deal.
  const status = listing.isFeatured
    ? { label: "Featured", className: "ws-pcard__badge--featured" }
    : isFresh(listing.publishedAt)
      ? { label: "New", className: "ws-pcard__badge--new" }
      : null;
  const store = showSeller ? listing.store : undefined;

  const saved = useSyncExternalStore(savedListings.subscribe, () =>
    savedListings.has(listing.id),
  );
  const prefetch = useListingPrefetch();
  const warm = () => prefetch(listing.slug || listing.id);

  return (
    <Link
      to={`/listings/${listing.slug}`}
      className="ws-plink"
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
    >
      <article className="ws-pcard">
        <div className="ws-pcard__media">
          {img ? (
            <>
              <img src={img} alt={listing.name} loading="lazy" />
              {hoverImg && (
                <img
                  src={hoverImg}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className="ws-pcard__alt"
                />
              )}
            </>
          ) : (
            <div className="ws-pcard__noimg">
              <span className="ws-pcard__noimg-icon">
                <ImageOff size={18} aria-hidden />
              </span>
              No photo yet
            </div>
          )}

          {status && (
            <div className="ws-pcard__badges">
              <span className={`ws-badge ${status.className}`}>
                {status.label}
              </span>
            </div>
          )}

          {images.length > 1 && (
            <span className="ws-pcard__count ws-num" aria-hidden>
              <Camera size={12} />
              {images.length}
            </span>
          )}

          <button
            type="button"
            className={`ws-pcard__save${saved ? " is-saved" : ""}`}
            aria-label={saved ? "Remove from saved" : "Save listing"}
            aria-pressed={saved}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSaved(listing);
            }}
          >
            <Heart size={16} aria-hidden />
          </button>
        </div>

        <div className="ws-pcard__body">
          {/* Condition leads, in mono caps. It is the first thing a buyer of a
              used item checks, and it sets expectations before the price. */}
          {condition && <p className="ws-pcard__condition">{condition}</p>}

          <h3 className="ws-pcard__title">{listing.name}</h3>

          {listing.shortDesc && (
            <p className="ws-pcard__desc">{listing.shortDesc}</p>
          )}

          {/* Rating or its absence: "No reviews yet" is worth saying, because a
              blank row reads as a missing component rather than a new seller. */}
          {listing.avgRating != null && (listing.reviewCount ?? 0) > 0 ? (
            <p className="ws-pcard__rating">
              <Star size={14} aria-hidden className="ws-pcard__star" />
              <span className="ws-pcard__ratingnum ws-num">
                {listing.avgRating.toFixed(1)}
              </span>
              <span className="ws-pcard__ratingcount ws-num">
                ({listing.reviewCount?.toLocaleString("en-NG")}{" "}
                {listing.reviewCount === 1 ? "review" : "reviews"})
              </span>
              <span className="ws-sr-only">
                , rated {listing.avgRating.toFixed(1)} out of 5
              </span>
            </p>
          ) : (
            <p className="ws-pcard__noreviews">No reviews yet</p>
          )}

          <div className="ws-pcard__price">
            <span className={`ws-price${onRequest ? " is-onrequest" : ""}`}>
              <span className="ws-sr-only">Price: </span>
              {priceLabel(listing)}
            </span>
            {listing.isNegotiable && !onRequest && (
              <span className="ws-pcard__neg">Negotiable</span>
            )}
          </div>

          <div className="ws-pcard__foot">
            {store && (
              <p className="ws-pcard__seller">
                {store.logo ? (
                  <img className="ws-pcard__sellerpic" src={store.logo} alt="" loading="lazy" />
                ) : (
                  <span className="ws-pcard__sellerpic" aria-hidden>
                    {store.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="ws-pcard__sellername">{store.name}</span>
                {store.verificationTier && isVerifiedTier(store.verificationTier) && (
                  <BadgeCheck size={14} aria-label="Verified seller" className="ws-pcard__verified" />
                )}
              </p>
            )}

            <p className="ws-pcard__meta">
              {location && (
                <span className="ws-pcard__loc">
                  <MapPin size={12} aria-hidden />
                  <span className="ws-pcard__locname">{location}</span>
                </span>
              )}
              {listing.publishedAt && (
                <span className="ws-pcard__age">
                  <Clock size={12} aria-hidden />
                  {timeAgo(listing.publishedAt)}
                </span>
              )}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
