import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Heart,
  ImageOff,
  MapPin,
} from "lucide-react";
import type { Listing, PublicStore } from "@/features/stores/api";
import {
  firstImage,
  imageSrc,
  priceLabel,
  type ImageRef,
} from "@/features/listings/model";
import { isVerifiedTier } from "@/features/stores/model";
import { savedListings } from "@/features/listings/savedListings";
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
  const eyebrow = [listing.category?.name, condition]
    .filter(Boolean)
    .join(" · ");
  const onRequest = priceLabel(listing) === "Contact for price";
  const status = listing.isFeatured
    ? { label: "Featured", className: "ws-pcard__badge--featured" }
    : isFresh(listing.publishedAt)
      ? { label: "Just listed", className: "ws-badge--ink ws-badge--dot" }
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
              savedListings.toggle(listing);
            }}
          >
            <Heart size={16} aria-hidden />
          </button>
        </div>

        <div className="ws-pcard__body">
          <h3 className="ws-pcard__title">{listing.name}</h3>

          <div className="ws-pcard__price">
            <span className={`ws-price${onRequest ? " is-onrequest" : ""}`}>
              {priceLabel(listing)}
            </span>
            {listing.isNegotiable && !onRequest && (
              <span className="ws-pcard__neg">Negotiable</span>
            )}
          </div>

          <p className="ws-pcard__meta">
            {location && (
              <span className="ws-pcard__loc">
                <MapPin size={12} aria-hidden />
                <span>{location}</span>
              </span>
            )}
          </p>
          {eyebrow && <p className="ws-pcard__eyebrow">{eyebrow}</p>}
        </div>

        <div className="ws-pcard__foot">
          {store && (
            <span className="ws-pcard__seller">
              <span className="ws-pcard__sellername">{store.name}</span>
              {store.verificationTier &&
                isVerifiedTier(store.verificationTier) && (
                  <BadgeCheck size={13} aria-label="Verified store" />
                )}
            </span>
          )}
          <span className="ws-pcard__cta" aria-hidden>
            <ArrowRight size={14} />
          </span>
        </div>
      </article>
    </Link>
  );
}
