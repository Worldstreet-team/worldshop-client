import Link from "next/link";
import { ArrowRightIcon, ChatDotsIcon, ClockIcon, LocationIcon, StoreIcon } from "@ws/components/icons";
import { Avatar, buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { NewSellerBadge, TopRatedBadge, VerifiedTick } from "@ws/features/listing-card/atoms/Seller";
import type { ReviewDimensions, SellerProfile } from "@ws/lib/data/types";
import { formatCount, plural } from "@ws/lib/format";
import { DIMENSIONS } from "@ws/lib/reviews";

/* SellerCard and SellerRatingsBreakdown (spec §7; flows B3 step 6; eBay "About this
   seller" and "Detailed seller ratings"). Seller feedback is a percentage and the four
   detailed ratings are averages of the seller's review records, so neither can be
   mistaken for this item's stars (R-073). "Message seller" opens the inbox placeholder
   until Phase 4. */

const joined = new Intl.DateTimeFormat("en-NG", { month: "short", year: "numeric", timeZone: rules.time.zone });
const percent = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 });

export function replyTime(hours: number) {
  if (hours <= 1) return "within an hour";
  if (hours < 24) return `within ${hours} hours`;
  return `within ${plural(Math.round(hours / 24), "day")}`;
}

type Props = {
  seller: SellerProfile;
  listingId: string;
  /** Detailed ratings averaged over `ratingCount` of the seller's reviews; null with none. */
  dimensions: ReviewDimensions | null;
  ratingCount: number;
};

export function SellerCard({ seller, listingId, dimensions, ratingCount }: Props) {
  const { positive_percent, count } = seller.feedback;
  const shop = `/seller/${seller.handle}`;
  return (
    <section className="ws-sellercard" aria-labelledby="seller-title">
      <h2 id="seller-title" className="ws-section-title">
        About this seller
      </h2>
      <div className="ws-sellercard__head">
        <Avatar name={seller.shop_name} size="lg" />
        <div className="ws-sellercard__who">
          <Link href={shop} className="ws-sellercard__name">
            {seller.shop_name}
            {seller.verified && <VerifiedTick />}
          </Link>
          <div className="ws-sellercard__badges">
            {seller.top_rated && <TopRatedBadge />}
            {!seller.top_rated && count < rules.trust.newSellerFeedbackCount && <NewSellerBadge />}
          </div>
          {count > 0 && (
            <p className="ws-sellercard__feedback">
              <strong>{percent.format(positive_percent)}% positive</strong> seller feedback ({formatCount(count)})
            </p>
          )}
        </div>
      </div>

      <dl className="ws-sellercard__facts">
        <div>
          <dt>
            <StoreIcon aria-hidden="true" />
            Joined
          </dt>
          <dd>
            <time dateTime={seller.joined_at}>{joined.format(new Date(seller.joined_at))}</time>
          </dd>
        </div>
        {seller.reply_hours !== undefined && (
          <div>
            <dt>
              <ClockIcon aria-hidden="true" />
              Usually replies
            </dt>
            <dd>{replyTime(seller.reply_hours)}</dd>
          </div>
        )}
        <div>
          <dt>
            <LocationIcon aria-hidden="true" />
            Located in
          </dt>
          <dd>
            {seller.area.area}, {seller.area.city}
          </dd>
        </div>
      </dl>

      {dimensions && <SellerRatingsBreakdown dimensions={dimensions} count={ratingCount} />}

      <div className="ws-sellercard__actions">
        <Link href={shop} className={buttonClass({ variant: "ghost", size: "sm", arrow: true })}>
          Visit shop
          <ArrowRightIcon />
        </Link>
        <Link href={`/inbox?seller=${seller.handle}&listing=${listingId}`} className={buttonClass({ variant: "quiet", size: "sm" })}>
          <ChatDotsIcon />
          Message seller
        </Link>
      </div>
    </section>
  );
}

/** eBay's four detailed seller ratings: a bar and the average for each, out of 5. */
export function SellerRatingsBreakdown({ dimensions, count, headingLevel: H = "h3" }: { dimensions: ReviewDimensions; count: number; headingLevel?: "h2" | "h3" }) {
  return (
    <div className="ws-dims">
      <H className="ws-subtitle">Detailed seller ratings</H>
      <p className="ws-dims__note">Average from {plural(count, "review")} of this seller&apos;s items</p>
      <ul className="ws-dims__list">
        {DIMENSIONS.map(({ key, label }) => (
          <li key={key}>
            <span className="ws-dims__label">{label}</span>
            <span className="ws-dims__bar" aria-hidden="true">
              <span style={{ width: `${(dimensions[key] / 5) * 100}%` }} />
            </span>
            <span className="ws-dims__value cx-num">
              {dimensions[key].toFixed(1)}
              <span className="cx-sr-only"> out of 5</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
