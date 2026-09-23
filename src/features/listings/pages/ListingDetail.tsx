import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import ListingRail from "@/features/listings/components/ListingRail";
import ListingGallery from "@/features/listings/components/detail/ListingGallery";
import ListingBuyBox from "@/features/listings/components/detail/ListingBuyBox";
import HowBuyingWorks from "@/features/listings/components/detail/HowBuyingWorks";
import ListingReviews from "@/features/reviews/components/ListingReviews";
import ReportButton from "@/features/reports/components/ReportButton";
import BackLink from "@/shared/components/BackLink";
import Tabs, { type Tab } from "@/shared/components/Tabs";
import { panelId, tabId } from "@/shared/lib/tabs";
import { useListingDetail } from "@/features/listings/hooks/useListingDetail";
import { postedAgo, priceLabel, type ImageRef } from "@/features/listings/model";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { formatLocation } from "@/shared/utils/locations";

const TABS_ID = "listing";
type TabKey = "description" | "specs" | "how" | "reviews";

function DetailSkeleton() {
  return (
    <div className="ws-wrap">
      <div className="ws-pdp" aria-busy="true" aria-label="Loading listing">
        <div className="ws-skeleton ws-listing__skelmedia" />
        <div className="ws-buybox">
          <div className="ws-skeleton" style={{ height: 30, width: "80%" }} />
          <div className="ws-skeleton" style={{ height: 14, width: "40%" }} />
          <div className="ws-skeleton" style={{ height: 34, width: "55%" }} />
          <div
            className="ws-skeleton"
            style={{ height: 120, borderRadius: "var(--ws-radius-lg)" }}
          />
          <div
            className="ws-skeleton"
            style={{ height: 48, borderRadius: "var(--ws-radius-pill)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ListingDetail() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { listing, loading, notFound, similar } = useListingDetail(idOrSlug);
  const [tab, setTab] = useState<TabKey>("description");

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
  const specs = [
    ...(listing.condition
      ? [
          {
            label: "Condition",
            value:
              listing.condition.charAt(0) +
              listing.condition.slice(1).toLowerCase(),
          },
        ]
      : []),
    ...(listing.brand ? [{ label: "Brand", value: listing.brand }] : []),
    ...(listing.material
      ? [{ label: "Material", value: listing.material }]
      : []),
    ...Object.entries(listing.attributes ?? {}).map(([label, value]) => ({
      label,
      value: String(value),
    })),
    ...(listing.customFields ?? []),
  ];

  // Facts about the listing rather than the item. They used to sit in the buy
  // box, where they competed with the price for the same glance.
  const ago = listing.publishedAt ? postedAgo(listing.publishedAt) : null;
  const about = [
    ...(location ? [{ label: "Item location", value: location }] : []),
    ...(ago ? [{ label: "Posted", value: ago }] : []),
    ...(listing.viewCount > 0
      ? [{ label: "Views", value: listing.viewCount.toLocaleString("en-NG") }]
      : []),
    ...(listing.category ? [{ label: "Category", value: listing.category.name }] : []),
  ];

  const tabs: Tab<TabKey>[] = [
    { key: "description", label: "Description" },
    {
      key: "specs",
      label: "Specifications",
      count: specs.length + about.length,
    },
    { key: "how", label: "How to buy" },
    { key: "reviews", label: "Reviews", count: listing.reviewCount ?? 0 },
  ];

  const showTab = (key: TabKey) => {
    setTab(key);
    document.getElementById(TABS_ID)?.scrollIntoView({ block: "start" });
  };

  const scrollToContact = () => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById("contact-panel")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });

    const target =
      document.getElementById("contact-message") ??
      document.querySelector<HTMLElement>(".ws-ask__cta");
    target?.focus({ preventScroll: true });
  };

  return (
    <>
      <div className="ws-wrap">
        <div className="ws-detailnav">
          <BackLink fallbackTo="/listings" fallbackLabel="All listings" />
        </div>

        <div className="ws-pdp">
          <div className="ws-pdp__media">
            <ListingGallery
              key={listing.id}
              images={images}
              name={listing.name}
            />
          </div>

          <div className="ws-pdp__buy">
            <ListingBuyBox
              listing={listing}
              location={location}
              onSeeReviews={() => showTab("reviews")}
            />
          </div>
        </div>

        <section
          className="ws-pdp__tabs"
          id={TABS_ID}
          aria-label="Listing details"
        >
          <Tabs
            idPrefix={TABS_ID}
            label="Listing details"
            tabs={tabs}
            active={tab}
            onChange={setTab}
          />

          <div
            role="tabpanel"
            id={panelId(TABS_ID, tab)}
            aria-labelledby={tabId(TABS_ID, tab)}
            className="ws-storetabs__panel"
            key={tab}
          >
            {tab === "description" && (
              <div className="ws-pdp__read">
                <p className="ws-listing__desc">{listing.description}</p>

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
              </div>
            )}

            {tab === "specs" && (
              <div className="ws-pdp__read">
                {specs.length > 0 && (
                  <div className="ws-pdp__specgroup">
                    <h3 className="ws-howbuy__head">About the item</h3>
                    <p className="ws-listing__hint">
                      Provided by the seller. Ask them to confirm anything that
                      matters to you.
                    </p>
                    <dl className="ws-facts">
                      {specs.map((s, i) => (
                        <div className="ws-facts__item" key={`${s.label}-${i}`}>
                          <dt>{s.label}</dt>
                          <dd>{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {about.length > 0 && (
                  <div className="ws-pdp__specgroup">
                    <h3 className="ws-howbuy__head">About this listing</h3>
                    <dl className="ws-facts">
                      {about.map((s) => (
                        <div className="ws-facts__item" key={s.label}>
                          <dt>{s.label}</dt>
                          <dd>{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            {tab === "how" && (
              <div className="ws-pdp__read">
                <HowBuyingWorks heading={false} />
              </div>
            )}

            {tab === "reviews" && <ListingReviews listingId={listing.id} />}
          </div>
        </section>

        <div className="ws-listing__report">
          <ReportButton
            targetType="LISTING"
            targetId={listing.id}
            targetName={listing.name}
            label="Report this listing"
          />
        </div>

        {listing.category && (
          <div className="ws-listing__more">
            <ListingRail
              id="listing-similar"
              eyebrow="More like this"
              title="Similar listings"
              sub={`Other listings in ${listing.category.name}.`}
              to={`/listings?categoryId=${listing.category.id}`}
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
          onClick={scrollToContact}
        >
          Message seller
        </button>
      </div>
      <div className="ws-actionbar__spacer" aria-hidden />
    </>
  );
}
