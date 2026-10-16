import Link from "next/link";
import { ChatDotsIcon } from "@ws/components/icons";
import { Avatar, buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { NewSellerBadge, TopRatedBadge, VerifiedTick } from "@ws/features/listing-card/atoms/Seller";
import type { SellerProfile } from "@ws/lib/data/types";
import { formatCount, plural } from "@ws/lib/format";

/* SellerProfileHeader (spec §13 SellerPublicProfile; flows B3 step 6): who the shop is
   and how it trades, above its tabs. The page's one h1 is the shop name. Feedback is the
   seller's percentage, never shown as stars (R-073). */

const joined = new Intl.DateTimeFormat("en-NG", { month: "short", year: "numeric", timeZone: rules.time.zone });
const percent = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 });

export function ShopHeader({ seller, itemCount }: { seller: SellerProfile; itemCount: number }) {
  const { positive_percent, count } = seller.feedback;
  return (
    <header className="ws-shophead">
      <Avatar name={seller.shop_name} size="xl" />
      <div className="ws-shophead__main">
        <h1 className="ws-shophead__name">
          {seller.shop_name}
          {seller.verified && <VerifiedTick />}
        </h1>
        <div className="ws-sellercard__badges">
          {seller.top_rated && <TopRatedBadge />}
          {!seller.top_rated && count < rules.trust.newSellerFeedbackCount && <NewSellerBadge />}
        </div>
        <ul className="ws-shophead__stats">
          {count > 0 && (
            <li>
              <strong>{percent.format(positive_percent)}% positive</strong> ({formatCount(count)})
            </li>
          )}
          <li>{plural(itemCount, "item")} for sale</li>
          <li>
            Joined <time dateTime={seller.joined_at}>{joined.format(new Date(seller.joined_at))}</time>
          </li>
          <li>
            {seller.area.area}, {seller.area.city}
          </li>
        </ul>
      </div>
      <Link href={`/inbox?seller=${seller.handle}`} className={buttonClass({ variant: "ghost", className: "ws-shophead__message" })}>
        <ChatDotsIcon />
        Message seller
      </Link>
    </header>
  );
}
