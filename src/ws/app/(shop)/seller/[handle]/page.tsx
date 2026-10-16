import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoreIcon } from "@ws/components/icons";
import { EmptyState } from "@ws/components/ui";
import { ListingCard } from "@ws/features/listing-card/ListingCard";
import { ReviewList } from "@ws/features/listing-detail/Reviews";
import { SellerRatingsBreakdown } from "@ws/features/listing-detail/SellerCard";
import { getAnchor } from "@ws/features/location/server";
import { ShopHeader } from "@ws/features/seller/ShopHeader";
import { ShopTabs, type ShopTab } from "@ws/features/seller/ShopTabs";
import { ESCROW } from "@ws/lib/copy/escrow";
import { repos, type ListingStatus } from "@ws/lib/data";
import { formatCount, plural } from "@ws/lib/format";
import { first } from "@ws/lib/search/params";
import { dimensionAverages } from "@ws/lib/reviews";
import { requestTime } from "@ws/lib/site";

/* SCR-005 Seller shop (spec §13 SellerPublicProfile; flows B3 step 6): the header, then
   Items, Reviews and About. Items are the shop's live listings; reviews are every review
   of its items; About holds how it trades and the four detailed ratings. Seller pages
   are public, so they're indexable. */

const EVERY_STATUS: ListingStatus[] = ["draft", "in_review", "live", "rejected", "paused", "reserved", "sold", "ended", "removed"];
const TABS: readonly ShopTab[] = ["items", "reviews", "about"];

export async function generateMetadata({ params }: PageProps<"/seller/[handle]">): Promise<Metadata> {
  const seller = await repos.sellers.getByHandle((await params).handle);
  if (!seller) return { title: "Seller not found", robots: { index: false } };
  const { positive_percent, count } = seller.feedback;
  const description = [count > 0 ? `${positive_percent}% positive feedback (${formatCount(count)})` : null, `${seller.area.area}, ${seller.area.city}`]
    .filter(Boolean)
    .join(" · ");
  return { title: seller.shop_name, description, alternates: { canonical: `/seller/${seller.handle}` } };
}

export default async function SellerPage({ params, searchParams }: PageProps<"/seller/[handle]">) {
  const seller = await repos.sellers.getByHandle((await params).handle);
  if (!seller) notFound();
  const tabParam = first((await searchParams).tab);
  const initial = TABS.includes(tabParam as ShopTab) ? (tabParam as ShopTab) : "items";

  const [{ anchor }, items, everything, reviews] = await Promise.all([
    getAnchor(),
    repos.listings.list({ seller_id: seller.id }),
    repos.listings.list({ seller_id: seller.id, status: EVERY_STATUS }),
    repos.reviews.forSeller(seller.id),
  ]);
  const listed = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const titles = Object.fromEntries(everything.map((l) => [l.id, l.title]));
  const dimensions = dimensionAverages(reviews);
  const now = requestTime();

  const itemsPanel = listed.length ? (
    <ul className="ws-card-grid" aria-label={`Items from ${seller.shop_name}`}>
      {listed.map((l) => (
        <li key={l.id}>
          <ListingCard listing={l} anchor={anchor} headingLevel="h2" now={now} />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState icon={<StoreIcon />} title="Nothing for sale right now" headingLevel="h2">
      {seller.shop_name} has no live listings. Check back later.
    </EmptyState>
  );

  const aboutPanel = (
    <div className="ws-shopabout">
      <dl className="ws-sellercard__facts">
        <div>
          <dt>Located in</dt>
          <dd>
            {seller.area.area}, {seller.area.city}
          </dd>
        </div>
        {seller.reply_hours !== undefined && (
          <div>
            <dt>Usually replies</dt>
            <dd>{seller.reply_hours <= 1 ? "within an hour" : `within ${plural(seller.reply_hours, "hour")}`}</dd>
          </div>
        )}
        <div>
          <dt>Identity</dt>
          <dd>{seller.verified ? "Verified ID" : "Not verified yet"}</dd>
        </div>
      </dl>
      {dimensions && <SellerRatingsBreakdown dimensions={dimensions} count={reviews.length} headingLevel="h2" />}
      <p className="cx-small">{ESCROW.strip}</p>
    </div>
  );

  return (
    <div className="ws-shop">
      <ShopHeader seller={seller} itemCount={listed.length} />
      <ShopTabs
        initial={initial}
        labels={{ items: `Items (${formatCount(listed.length)})`, reviews: `Reviews (${formatCount(reviews.length)})`, about: "About" }}
        panels={{
          items: itemsPanel,
          reviews: <ReviewList reviews={reviews} scope="seller" shopName={seller.shop_name} titles={titles} now={now} headingLevel="h2" />,
          about: aboutPanel,
        }}
      />
    </div>
  );
}
