import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ListingRail from "@/features/listings/components/ListingRail";
import ListingGallery from "@/features/listings/components/detail/ListingGallery";
import ListingBuyBox from "@/features/listings/components/detail/ListingBuyBox";
import SellerCard from "@/features/listings/components/detail/SellerCard";
import HowBuyingWorks from "@/features/listings/components/detail/HowBuyingWorks";
import ListingReviews from "@/features/reviews/components/ListingReviews";
import ReportButton from "@/features/reports/components/ReportButton";
import type { ContactSellerHandle } from "@/features/stores/components/ContactSeller";
import BackLink from "@/shared/components/BackLink";
import Tabs, { type Tab } from "@/shared/components/Tabs";
import { panelId, tabId } from "@/shared/lib/tabs";
import { useListingDetail } from "@/features/listings/hooks/useListingDetail";
import { postedAgo, priceLabel, type ImageRef } from "@/features/listings/model";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { formatLocation } from "@/shared/utils/locations";

const TABS_ID = "listing";
const FACTS_SHOWN = 4;
type TabKey = "about" | "specs" | "delivery" | "how";

const TABS: Tab<TabKey>[] = [
  { key: "about", label: "About this item" },
  { key: "specs", label: "Specifications" },
  { key: "delivery", label: "Delivery & returns" },
  { key: "how", label: "How to buy" },
];

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

type Row = { label: string; value: string };

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="ws-ldrows">
      {rows.map((r, i) => (
        <div key={`${r.label}-${i}`}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailSkeleton() {
  return (
    <div className="ws-wrap">
      <div className="ws-ld__grid" aria-busy="true" aria-label="Loading listing">
        <div className="ws-skeleton ws-ld__skelmedia" />
        <div className="ws-ld__side">
          <div className="ws-skeleton" style={{ height: 32, width: "80%" }} />
          <div className="ws-skeleton" style={{ height: 16, width: "50%" }} />
          <div className="ws-skeleton" style={{ height: 36, width: "40%" }} />
          <div className="ws-skeleton" style={{ height: 44, borderRadius: "var(--ws-radius-lg)" }} />
          <div className="ws-skeleton" style={{ height: 120, borderRadius: "var(--ws-radius-xl)" }} />
        </div>
      </div>
    </div>
  );
}

export default function ListingDetail() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { listing, loading, notFound, similar } = useListingDetail(idOrSlug);
  const [tab, setTab] = useState<TabKey>("about");
  // One composer for the page. The buy box renders it; the seller card and the
  // mobile bar open it from wherever they sit.
  const contact = useRef<ContactSellerHandle>(null);

  usePageTitle(notFound ? "Listing not available" : listing?.name);

  if (loading) return <DetailSkeleton />;

  if (notFound || !listing) {
    return (
      <div className="ws-wrap">
        <BackLink fallbackTo="/listings" fallbackLabel="All listings" />

        <div
          className="ws-empty"
          style={{ marginBlock: "var(--ws-space-8) var(--ws-space-16)" }}
        >
          <h1 className="ws-h2">Listing not available</h1>
          <p className="ws-caption ws-muted">
            This listing may have been removed, or the seller's store is not
            currently active.
          </p>
          <Link to="/listings" className="ws-btn ws-btn--sm ws-btn--primary">
            Browse the marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = (listing.images as ImageRef[]) ?? [];
  const location = formatLocation(
    [listing.city, listing.state],
    listing.country,
  );
  const attributes: Row[] = Object.entries(listing.attributes ?? {}).map(
    ([label, value]) => ({ label, value: String(value) }),
  );
  // Brand and material are columns of their own, and a category can also ask
  // for them as attributes. The first mention wins so neither shows twice.
  const named = new Set<string>();
  const once = (rows: Row[]) =>
    rows.filter((r) => {
      const key = r.label.trim().toLowerCase();
      if (named.has(key)) return false;
      named.add(key);
      return true;
    });
  const specs = once([
    ...(listing.condition ? [{ label: "Condition", value: sentence(listing.condition) }] : []),
    ...(listing.brand ? [{ label: "Brand", value: listing.brand }] : []),
    ...(listing.material ? [{ label: "Material", value: listing.material }] : []),
    ...attributes,
    ...(listing.customFields ?? []),
  ]);

  // Facts about the listing rather than the item.
  const ago = listing.publishedAt ? postedAgo(listing.publishedAt) : null;
  const about: Row[] = [
    ...(location ? [{ label: "Item location", value: location }] : []),
    ...(ago ? [{ label: "Posted", value: ago }] : []),
    ...(listing.viewCount > 0
      ? [{ label: "Views", value: listing.viewCount.toLocaleString("en-NG") }]
      : []),
    ...(listing.category ? [{ label: "Category", value: listing.category.name }] : []),
  ];

  // The strip under the fold line: the four things a buyer checks before
  // reading anything. Ordered by how often they decide a sale, and topped up
  // from the plainer fields when a listing has no stock or delivery to show.
  const lead = specs.filter((s) => s.label !== "Condition");
  const facts: Row[] = [
    ...specs.filter((s) => s.label === "Condition"),
    ...lead.slice(0, 1),
    ...(listing.stockLeft != null ? [{ label: "Left in stock", value: String(listing.stockLeft) }] : []),
    ...(listing.delivery ? [{ label: "Delivery", value: listing.delivery.summary }] : []),
    ...lead.slice(1),
    ...(location ? [{ label: "Location", value: location }] : []),
  ].slice(0, FACTS_SHOWN);

  const message = () => contact.current?.start();

  return (
    <>
      <div className="ws-wrap ws-ld">
        <nav aria-label="Breadcrumb" className="ws-ldcrumbs">
          <ol>
            <li>
              <Link to="/">Home</Link>
              <span aria-hidden>/</span>
            </li>
            <li>
              <Link to="/categories">All categories</Link>
              <span aria-hidden>/</span>
            </li>
            {listing.category && (
              <li>
                <Link to={`/categories/${listing.category.slug}`}>{listing.category.name}</Link>
                <span aria-hidden>/</span>
              </li>
            )}
            <li>
              <span aria-current="page">{listing.name}</span>
            </li>
          </ol>
        </nav>

        <div className="ws-ld__grid">
          <ListingGallery
            key={listing.id}
            images={images}
            name={listing.name}
          />

          <div className="ws-ld__side">
            <ListingBuyBox
              key={listing.id}
              listing={listing}
              location={location}
              contact={contact}
            />
            <SellerCard store={listing.store} onMessage={message} />
          </div>
        </div>

        {facts.length > 0 && (
          <ul className="ws-ldfacts">
            {facts.map((f) => (
              <li key={f.label}>
                <p className="ws-ldeyebrow">{f.label}</p>
                <p>{f.value}</p>
              </li>
            ))}
          </ul>
        )}

        <section className="ws-ld__tabs" id={TABS_ID} aria-label="Listing information">
          <Tabs
            idPrefix={TABS_ID}
            label="Listing information"
            tabs={TABS}
            active={tab}
            onChange={setTab}
            block="ws-ldtabs"
          />

          <div
            role="tabpanel"
            id={panelId(TABS_ID, tab)}
            aria-labelledby={tabId(TABS_ID, tab)}
            className="ws-ldtabs__panel"
            key={tab}
          >
            {tab === "about" && (
              <>
                <p className="ws-ldcopy">{listing.description}</p>

                {listing.tags.length > 0 && (
                  <div className="ws-taglist">
                    {listing.tags.map((t) => (
                      <Link
                        key={t}
                        to={`/listings?search=${encodeURIComponent(t)}`}
                        className="ws-tag"
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "specs" && (
              <>
                {specs.length > 0 && (
                  <>
                    <Rows rows={specs} />
                    <p className="ws-ldhint">
                      Provided by the seller. Ask them to confirm anything that
                      matters to you.
                    </p>
                  </>
                )}

                {about.length > 0 && (
                  <>
                    <h3 className="ws-ldeyebrow">About this listing</h3>
                    <Rows rows={about} />
                  </>
                )}
              </>
            )}

            {tab === "delivery" && (
              <>
                {listing.delivery && <Rows rows={listing.delivery.zones} />}
                <p className="ws-ldcopy">
                  Returns accepted within 7 days if the item isn't as described.
                  Your payment stays in escrow until you confirm delivery.
                </p>
              </>
            )}

            {tab === "how" && <HowBuyingWorks heading={false} />}
          </div>
        </section>

        <ListingReviews
          key={listing.id}
          listingId={listing.id}
          storeSlug={listing.store.slug}
        />

        <div className="ws-ld__report">
          <ReportButton
            targetType="LISTING"
            targetId={listing.id}
            targetName={listing.name}
            label="Report this listing"
          />
        </div>

        {listing.category && (
          <div className="ws-ld__more">
            <ListingRail
              id="listing-similar"
              eyebrow="Similar listings"
              title={`More in ${listing.category.name}`}
              to={`/categories/${listing.category.slug}`}
              items={similar}
              loading={false}
            />
          </div>
        )}
      </div>

      <div className="ws-actionbar">
        <div className="ws-actionbar__price">
          <span className="ws-price">{priceLabel(listing)}</span>
          {location && <span className="ws-actionbar__loc">{location}</span>}
        </div>
        <button
          type="button"
          className="ws-btn ws-btn--primary"
          onClick={message}
        >
          Message seller
        </button>
      </div>
      <div className="ws-actionbar__spacer" aria-hidden />
    </>
  );
}
