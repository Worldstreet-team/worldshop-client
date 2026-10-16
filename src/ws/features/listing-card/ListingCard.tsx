import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ImageIcon } from "@ws/components/icons";
import { Card, Skeleton } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { cx } from "@ws/lib/cx";
import { listingPath } from "@ws/lib/data/repo";
import type { ListingWithSeller } from "@ws/lib/data/types";
import { plural } from "@ws/lib/format";
import type { Anchor } from "@ws/lib/areas";
import { haversineKm } from "@ws/lib/geo";
import { DeliveryLine, KeyFacts, LocationLine, PriceBlock, RatingStars, SaveButton, SellerMini, SocialProof } from "./atoms";
import { CardMenu, HideGate } from "./CardActions";
import { CardPhotos } from "./CardPhotos";
import { Tilt } from "@ws/components/motion/Tilt";

/* ListingCard (spec §5.1–5.2) in eBay's order: photo with the heart, condition, title,
   rating, price, delivery and total, location, demand, then seller and the ⋮ menu.
   The title is the card's one link, stretched over the card (spec §16.6); Save and the
   menu are their own buttons above it.

   Variants:
   - grid: search and saved. The photo fills the card at 1:1.
   - list: eBay's list view. Photo left (200px, 112px on phones), details right.
   - rail: home rows, 220px wide (160px on phones), without the seller row.
   - compact: a 72px thumbnail row for similar items and messages.
   Whenever the details column is narrower than 240px (phone grids, home rails, the
   phone list view) it trims itself to eBay's app density (see listing.css), so every
   variant shares one set of rules. */

export type { Anchor } from "@ws/lib/areas";

export type ListingCardVariant = "grid" | "list" | "rail" | "compact";

type Props = {
  listing: ListingWithSeller;
  variant?: ListingCardVariant;
  anchor?: Anchor;
  /** Override the photo's `sizes` when a layout differs from the defaults below. */
  sizes?: string;
  /**
   * Above-the-fold photos: "high" = eager + fetchpriority high (the first couple of
   * results, likely LCP), "eager" = loaded straight away, default lazy
   * (rules.media; Next 16 deprecates `priority`).
   */
  load?: "high" | "eager" | "lazy";
  headingLevel?: "h2" | "h3";
  now?: number;
};

const SIZES: Record<ListingCardVariant, string> = {
  // Matches the results grid: 3 columns beside the 260px filter rail from 1024 (capped by
  // the 1320 container), 3 from 768, 2 on phones.
  grid: "(min-width: 1380px) 330px, (min-width: 1024px) calc((100vw - 344px) / 3), (min-width: 768px) 33vw, calc(50vw - 22px)",
  list: "(min-width: 768px) 200px, 112px",
  rail: "(min-width: 768px) 220px, 160px",
  compact: "72px",
};

export function ListingCard({ listing, variant = "grid", anchor, sizes, load = "lazy", headingLevel: H = "h3", now }: Props) {
  const photo = listing.media[0];
  const href = listingPath(listing);
  const title = (
    <H className="ws-card__title">
      <Link href={href} className="ws-card__link">
        {listing.title}
      </Link>
    </H>
  );
  const gate = (card: ReactNode) => (
    <HideGate listingId={listing.id} sellerId={listing.seller.id} shopName={listing.seller.shop_name}>
      {card}
    </HideGate>
  );

  if (variant === "compact") {
    return gate(
      <Card as="article" interactive className="ws-card ws-card--compact">
        <div className="ws-card__media">
          {photo && <Image src={photo.url} alt={photo.alt} fill sizes={sizes ?? SIZES.compact} quality={rules.media.thumbQuality} />}
        </div>
        <div className="ws-card__body">
          {title}
          <PriceBlock price_minor={listing.price_minor} was_minor={listing.was_minor} period={listing.price_period} kind={listing.price_kind} max_minor={listing.max_price_minor} variant="compact" className="ws-card__compact-price" />
          <KeyFacts listing={listing} />
        </div>
      </Card>,
    );
  }

  const distanceKm = anchor ? haversineKm(anchor, listing.location) : undefined;
  const tilt = (card: ReactNode) => (variant === "grid" ? <Tilt>{card}</Tilt> : card);
  return gate(tilt(
    <Card as="article" interactive className={cx("ws-card", `ws-card--${variant}`)}>
      <div className="ws-card__media">
        {variant === "rail" ? (
          <>
            {photo && (
              <Image src={photo.url} alt={photo.alt} fill sizes={sizes ?? SIZES.rail} loading={load === "lazy" ? "lazy" : "eager"} quality={rules.media.thumbQuality} />
            )}
            {listing.media.length > 1 && (
              <span className="ws-card__photos">
                <ImageIcon />
                <span aria-hidden="true">{listing.media.length}</span>
                <span className="cx-sr-only">{plural(listing.media.length, "photo")}</span>
              </span>
            )}
          </>
        ) : (
          <CardPhotos listingId={listing.id} media={listing.media} href={href} sizes={sizes ?? SIZES[variant]} load={load} />
        )}
        <div className="ws-card__save">
          <SaveButton listingId={listing.id} title={listing.title} price_minor={listing.price_minor} />
        </div>
      </div>

      <div className="ws-card__body">
        <div className="ws-card__stack">
          <div className="ws-card__head">
            {title}
            <KeyFacts listing={listing} />
            <div className="ws-card__rating">{listing.rating && <RatingStars value={listing.rating.average} count={listing.rating.count} />}</div>
          </div>

          <PriceBlock price_minor={listing.price_minor} was_minor={listing.was_minor} period={listing.price_period} kind={listing.price_kind} max_minor={listing.max_price_minor} bestOffer={listing.offers_enabled} />

          <div className="ws-card__meta">
            {/* Rent and viewings, not deliveries. */}
            {listing.category.kind !== "property" && (
              <DeliveryLine
                options={listing.delivery}
                price_minor={listing.price_minor}
                listingCity={listing.location.city}
                buyer={anchor && { city: anchor.city, label: anchor.label }}
              />
            )}
            <LocationLine place={listing.location} distanceKm={distanceKm} postedAt={listing.created_at} now={now} />
            <SocialProof listing={listing} showWatchers={listing.seller.show_watchers} />
          </div>

          {variant !== "rail" && (
            <div className="ws-card__foot">
              <SellerMini seller={listing.seller} />
              <div className="ws-card__menu">
                <CardMenu listingId={listing.id} title={listing.title} sellerId={listing.seller.id} shopName={listing.seller.shop_name} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>,
  ));
}

/** Same box as the card, so swapping it in causes no layout shift (spec §5.2). */
export function ListingCardSkeleton({ variant = "grid" }: { variant?: ListingCardVariant }) {
  if (variant === "compact") {
    return (
      <Card as="div" className="ws-card ws-card--compact ws-card--skeleton">
        <div className="ws-card__media">
          <Skeleton width="100%" height="100%" radius={0} />
        </div>
        <div className="ws-card__body">
          <Skeleton width="90%" height={14} />
          <Skeleton width="40%" height={16} />
        </div>
      </Card>
    );
  }
  return (
    <Card as="div" className={cx("ws-card", `ws-card--${variant}`, "ws-card--skeleton")}>
      <div className="ws-card__media">
        <Skeleton width="100%" height="100%" radius={0} />
      </div>
      <div className="ws-card__body">
        <div className="ws-card__stack">
          <div className="ws-card__head">
            <Skeleton width={84} height={20} radius="var(--cx-r-pill)" />
            <div className="ws-card__title">
              <Skeleton width="92%" height="0.9lh" />
              <Skeleton width="64%" height="0.9lh" />
            </div>
            <div className="ws-card__rating">
              <Skeleton width={96} height={12} />
            </div>
          </div>
          <Skeleton width="48%" height={22} />
          <div className="ws-card__meta">
            <Skeleton width="72%" height={14} />
            <Skeleton width="58%" height={14} />
          </div>
          {variant !== "rail" && (
            <div className="ws-card__foot">
              <Skeleton width="70%" height={14} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
