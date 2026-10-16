import { rules } from "@ws/config/marketplace-rules";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeftIcon } from "@ws/components/icons";
import { DeliveryLine, KeyFacts, PriceBlock, RatingStars, SellerMini, conditionLabel } from "@ws/features/listing-card/atoms";
import { CopyField, DescriptionBlock } from "@ws/features/listing-detail/About";
import { BuyActions } from "@ws/features/listing-detail/BuyActions";
import { Gallery } from "@ws/features/listing-detail/Gallery";
import { DemandLine, ReassuranceLine } from "@ws/features/listing-detail/Lines";
import { DeliveryPanel, ItemSpecifics, PaymentsPanel, ProtectionPanel, ReturnsPanel, SafetyTipsCard } from "@ws/features/listing-detail/Panels";
import { ReportButton, ReportListingModal } from "@ws/features/listing-detail/ReportListing";
import { reportListing } from "@ws/features/listing-detail/report-action";
import { ShareButton, ShareSheet } from "@ws/features/listing-detail/ShareSheet";
import { ReviewsSection } from "@ws/features/listing-detail/Reviews";
import { RevisionHistory, SellerNotes } from "@ws/features/listing-detail/RevisionHistory";
import { PriceHistory } from "@ws/features/listing-detail/PriceHistory";
import { SellerCard } from "@ws/features/listing-detail/SellerCard";
import { StickyBuyBar } from "@ws/features/listing-detail/StickyBuyBar";
import { UnavailableState } from "@ws/features/listing-detail/Unavailable";
import { getHidden } from "@ws/features/hidden/server";
import { ProductRail } from "@ws/features/home/ProductRail";
import { setLocation } from "@ws/features/location/actions";
import { getAnchor } from "@ws/features/location/server";
import { RecordView } from "@ws/features/recent/RecordView";
import { listingPath, parseListingParam, repos, type ListingStatus } from "@ws/lib/data";
import { deliveryFee, summariseDelivery } from "@ws/lib/delivery";
import { timeAgo } from "@ws/lib/format";
import { formatCurrency } from "@ws/lib/money";
import { availability } from "@ws/lib/availability";
import { buyerTotal } from "@ws/lib/pricing";
import { sellerOtherListings, similarListings } from "@ws/lib/related";
import { dimensionAverages } from "@ws/lib/reviews";
import { requestTime, siteOrigin } from "@ws/lib/site";

/* SCR-004 Listing detail (flows B3, spec §7), eBay's layout: gallery left, the buy box
   right from 1024px (stacked below that), with the page's one h1 in the title block.
   Price, delivery to the buyer's area, returns and the escrow line sit above the fold on
   a 375×812 phone (§18 stage 3), and a sticky buy bar replaces the bottom nav there.
   Old or wrong slugs redirect to the canonical /listing/:id-:slug (R-011). */

const EVERY_STATUS: ListingStatus[] = ["draft", "in_review", "live", "rejected", "paused", "reserved", "sold", "ended", "removed"];

async function load(slug: string) {
  const parsed = parseListingParam(slug);
  return parsed ? { parsed, listing: await repos.listings.get(parsed.id) } : null;
}

/* Link previews (blueprint F16): listings get shared on WhatsApp, so the preview says
   price, condition and area. Never a phone number or an address. */
export async function generateMetadata({ params }: PageProps<"/listing/[slug]">): Promise<Metadata> {
  const listing = (await load((await params).slug))?.listing;
  if (!listing || availability(listing) === "gone") return { title: "Listing not found", robots: { index: false } };
  const price = `${formatCurrency(listing.price_minor)}${listing.price_period ? ` per ${listing.price_period}` : ""}`;
  const description = [price, listing.category.kind === "property" ? null : conditionLabel(listing.condition), `${listing.location.area}, ${listing.location.city}`]
    .filter(Boolean)
    .join(" · ");
  const url = listingPath(listing);
  return {
    title: listing.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: listing.title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title: listing.title, description },
  };
}

export default async function ListingPage({ params }: PageProps<"/listing/[slug]">) {
  const found = await load((await params).slug);
  if (!found?.listing) notFound();
  const { listing, parsed } = found;
  // Removed, draft, in-review and rejected listings were never public, or no longer are.
  const state = availability(listing);
  if (state === "gone") notFound();
  if (parsed.slug !== listing.slug) permanentRedirect(listingPath(listing));
  const [{ anchor }, hidden, itemReviews, sellerReviews, visibleListings, sellerListings] = await Promise.all([
    getAnchor(),
    getHidden(),
    repos.reviews.forListing(listing.id),
    repos.reviews.forSeller(listing.seller_id),
    repos.listings.list(),
    repos.listings.list({ seller_id: listing.seller_id, status: EVERY_STATUS }),
  ]);
  const related = { listing, all: visibleListings, anchor, hidden };
  const similar = similarListings(related);
  const fromSeller = sellerOtherListings(related);
  // Reviews on the seller tab name what was bought, including items no longer on sale.
  const titles = Object.fromEntries(sellerListings.map((l) => [l.id, l.title]));
  const messageHref = `/inbox?seller=${listing.seller.handle}&listing=${listing.id}`;

  const goods = listing.category.kind === "goods";
  const summary = summariseDelivery(listing.delivery, anchor.city === listing.location.city);
  const fee = deliveryFee(summary);
  // One total for the buy box and the sticky bar (R-020).
  const total = goods && fee !== null && fee > 0 ? `Total to ${anchor.label} ${formatCurrency(buyerTotal({ item_minor: listing.price_minor, delivery_minor: fee }))}` : undefined;
  const price = `${formatCurrency(listing.price_minor)}${listing.price_period ? ` per ${listing.price_period}` : ""}`;
  const catHref = `/search?cat=${listing.category.id}`;
  const path = listingPath(listing);
  const share = { url: `${await siteOrigin()}${path}`, title: listing.title, text: `${listing.title}, ${price} on WorldStore` };
  const now = requestTime();
  const listed = timeAgo(listing.created_at, now);

  return (
    <article className="ws-listing">
      <RecordView id={listing.id} />
      <nav aria-label="Breadcrumb" className="ws-crumbs">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href={catHref}>{listing.category.name}</Link>
          </li>
          <li aria-current="page">{listing.title}</li>
        </ol>
        <Link href={catHref} className="ws-crumbs__back">
          <ArrowLeftIcon />
          {listing.category.name}
        </Link>
      </nav>

      <div className="ws-listing__top">
        <Gallery listingId={listing.id} title={listing.title} media={listing.media}>
          <ShareButton {...share} className="ws-gallery__share" />
        </Gallery>

        <div className="ws-listing__side">
          <header className="ws-listing__title">
            <h1>{listing.title}</h1>
            {/* Condition leads the facts line, eBay style (no separate chip). */}
            <div className="ws-listing__facts">
              <KeyFacts listing={listing} />
              {listing.rating && <RatingStars value={listing.rating.average} count={listing.rating.count} />}
            </div>
          </header>

          <section className="ws-buybox" aria-label="Price and buying">
            {(state === "sold" || state === "ended") && <p className="ws-pricenote">{state === "sold" ? "Sold for" : "Last price"}</p>}
            <PriceBlock
              variant="detail"
              price_minor={listing.price_minor}
              was_minor={listing.was_minor}
              period={listing.price_period}
              kind={listing.price_kind}
              max_minor={listing.max_price_minor}
              bestOffer={listing.offers_enabled}
            />
            {rules.flags.priceHistory && <PriceHistory price_minor={listing.price_minor} created_at={listing.created_at} revisions={listing.revisions} now={now} />}
            {state === "available" ? (
              <>
                {goods && <DeliveryLine options={listing.delivery} price_minor={listing.price_minor} listingCity={listing.location.city} buyer={anchor} />}
                <ReassuranceLine listing={listing} />
                <div id="buybox-actions">
                  <BuyActions
                    listingId={listing.id}
                    title={listing.title}
                    price_minor={listing.price_minor}
                    available={listing.qty}
                    sold={listing.sold_count}
                    kind={listing.category.kind}
                    offers={listing.offers_enabled}
                  />
                </div>
                <DemandLine listing={listing} />
              </>
            ) : (
              <div id="buybox-actions">
                <UnavailableState
                  availability={state}
                  listingId={listing.id}
                  title={listing.title}
                  price_minor={listing.price_minor}
                  similarHref={similar.length ? "#rail-similar" : catHref}
                  shopHref={`/seller/${listing.seller.handle}`}
                  messageHref={messageHref}
                />
              </div>
            )}
            <div className="ws-buybox__seller">
              <SellerMini seller={listing.seller} link avatar />
              {/* SellerStrip (spec §7): eBay's "Seller's other items" and "Message". */}
              <p className="ws-buybox__sellerlinks">
                {fromSeller.length > 0 && <a href="#rail-seller-items">Seller&apos;s other items</a>}
                <Link href={messageHref}>Message seller</Link>
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="ws-listing__more">
        <div className="ws-listing__panels">
          <DeliveryPanel listing={listing} anchor={anchor} total={total} now={now} returnTo={path} action={setLocation} />
          <ReturnsPanel listing={listing} />
          <PaymentsPanel listing={listing} />
          <ProtectionPanel listing={listing} report={<ReportButton className="ws-protect__report" />} />
        </div>

        <section className="ws-about" aria-labelledby="about-title">
          <h2 id="about-title" className="ws-section-title">
            About this item
          </h2>
          <ItemSpecifics listing={listing} />
          {listing.seller_notes && <SellerNotes notes={listing.seller_notes} shopName={listing.seller.shop_name} />}
          <DescriptionBlock text={listing.description} />
          <dl className="ws-itemmeta">
            <div>
              <dt>Item number</dt>
              <dd>
                <CopyField label="item number" value={listing.id} />
              </dd>
            </div>
            {listing.revisions && listing.revisions.length > 0 && (
              <div>
                <dt>Last updated</dt>
                <dd>
                  <time dateTime={listing.revisions.at(-1)!.at}>{timeAgo(listing.revisions.at(-1)!.at, now).long.replace(/^./, (c) => c.toUpperCase())}</time>{" "}
                  <RevisionHistory revisions={listing.revisions} listedAt={listing.created_at} />
                </dd>
              </div>
            )}
            <div>
              <dt>Listed</dt>
              <dd>
                <time dateTime={listing.created_at}>{listed.long.replace(/^./, (c) => c.toUpperCase())}</time>
              </dd>
            </div>
          </dl>
        </section>

        <SafetyTipsCard listing={listing} />

        <SellerCard seller={listing.seller} listingId={listing.id} dimensions={dimensionAverages(sellerReviews)} ratingCount={sellerReviews.length} />
        <ReviewsSection itemReviews={itemReviews} sellerReviews={sellerReviews} shopName={listing.seller.shop_name} titles={titles} now={now} />
      </div>

      {similar.length > 0 && (
        <ProductRail
          id="similar"
          eyebrow={listing.category.name}
          title="Similar items"
          seeAll={{ href: catHref, srLabel: `${listing.category.name} listings` }}
          listings={similar}
          anchor={anchor}
          now={now}
        />
      )}
      {fromSeller.length > 0 && (
        <ProductRail
          id="seller-items"
          eyebrow={listing.seller.shop_name}
          title="Seller's other items"
          seeAll={{ href: `/seller/${listing.seller.handle}`, label: "Visit shop", srLabel: `of ${listing.seller.shop_name}` }}
          listings={fromSeller}
          anchor={anchor}
          now={now}
        />
      )}

      <ShareSheet {...share} />
      <ReportListingModal listingId={listing.id} title={listing.title} sellerName={listing.seller.shop_name} submit={reportListing} />

      <StickyBuyBar
        watch="buybox-actions"
        listingId={listing.id}
        title={listing.title}
        price={price}
        price_minor={listing.price_minor}
        total={total}
        share={share}
        action={
          state === "reserved"
            ? { label: "Message seller", href: messageHref }
            : state !== "available"
              ? { label: "See similar items", href: similar.length ? "#rail-similar" : catHref }
              : goods
                ? { label: "Make offer", href: `/offers?listing=${listing.id}` }
                : { label: "Contact seller", href: `/inbox?listing=${listing.id}` }
        }
      />
    </article>
  );
}
