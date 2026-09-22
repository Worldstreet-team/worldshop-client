import { useParams, Link } from "react-router-dom";
import ContactSeller from "@/features/stores/components/ContactSeller";
import SellerCard from "@/features/stores/components/SellerCard";
import ListingRail from "@/features/listings/components/ListingRail";
import ListingGallery from "@/features/listings/components/detail/ListingGallery";
import ListingSummary from "@/features/listings/components/detail/ListingSummary";
import HowBuyingWorks from "@/features/listings/components/detail/HowBuyingWorks";
import ListingReviews from "@/features/reviews/components/ListingReviews";
import ReportButton from "@/features/reports/components/ReportButton";
import BackLink from "@/shared/components/BackLink";
import { useListingDetail } from "@/features/listings/hooks/useListingDetail";
import { fmtNaira, priceLabel, type ImageRef } from "@/features/listings/model";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { formatLocation } from "@/shared/utils/locations";

function DetailSkeleton() {
  return (
    <div className="ws-wrap">
      <div className="ws-listing" aria-busy="true" aria-label="Loading listing">
        <div className="ws-listing__main">
          <div className="ws-skeleton ws-listing__skelmedia" />
        </div>
        <div className="ws-listing__side">
          <div className="ws-card ws-summary">
            <div className="ws-skeleton" style={{ height: 12, width: "30%" }} />
            <div className="ws-skeleton" style={{ height: 30, width: "80%" }} />
            <div className="ws-skeleton" style={{ height: 28, width: "50%" }} />
            <div className="ws-skeleton" style={{ height: 14, width: "60%" }} />
          </div>
          <div
            className="ws-skeleton"
            style={{ height: 240, borderRadius: "var(--ws-radius-xl)" }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ListingDetail() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { listing, loading, notFound, similar } = useListingDetail(idOrSlug);

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
    ...Object.entries(listing.attributes ?? {}).map(([label, value]) => ({
      label,
      value: String(value),
    })),
    ...(listing.customFields ?? []),
  ];

  const scrollToContact = () => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById("contact-panel")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    document.getElementById("contact-message")?.focus({ preventScroll: true });
  };

  return (
    <>
      <div className="ws-wrap">
        <div className="ws-detailnav">
          <BackLink fallbackTo="/listings" fallbackLabel="All listings" />
        </div>

        <div className="ws-listing">
          <div className="ws-listing__main">
            <div className="ws-listing__gallery">
              <ListingGallery
                key={listing.id}
                images={images}
                name={listing.name}
              />
            </div>

            <div className="ws-listing__body">
              <section
                className="ws-detail__section"
                aria-labelledby="listing-about"
              >
                <h2 className="ws-h2" id="listing-about">
                  About this item
                </h2>
                <p className="ws-body ws-muted ws-listing__desc">
                  {listing.description}
                </p>

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
              </section>

              {specs.length > 0 && (
                <section
                  className="ws-detail__section"
                  aria-labelledby="listing-details"
                >
                  <h2 className="ws-h2" id="listing-details">
                    Details
                  </h2>
                  <p className="ws-listing__hint">
                    Provided by the seller. Ask them to confirm anything that
                    matters to you.
                  </p>
                  <dl className="ws-spec">
                    {specs.map((s, i) => (
                      <div className="ws-spec__row" key={`${s.label}-${i}`}>
                        <dt>{s.label}</dt>
                        <dd>{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {listing.variants.length > 0 && (
                <section
                  className="ws-detail__section"
                  aria-labelledby="listing-options"
                >
                  <h2 className="ws-h2" id="listing-options">
                    Available options
                  </h2>
                  <p className="ws-listing__hint">
                    Each option has its own price. Say which one you want when
                    you message the seller.
                  </p>
                  <dl className="ws-spec">
                    {listing.variants.map((v, i) => (
                      <div className="ws-spec__row" key={v.id ?? i}>
                        <dt>
                          {v.name || Object.values(v.attributes).join(" / ")}
                        </dt>
                        <dd className="ws-num">
                          {v.price != null ? fmtNaira(v.price) : "—"}
                          {v.isAvailable === false && (
                            <span
                              className="ws-badge ws-badge--danger"
                              style={{ marginLeft: "var(--ws-space-2)" }}
                            >
                              Sold out
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              <ListingReviews listingId={listing.id} />

              <div className="ws-listing__report">
                <ReportButton
                  targetType="LISTING"
                  targetId={listing.id}
                  targetName={listing.name}
                  label="Report this listing"
                />
              </div>
            </div>
          </div>

          <div className="ws-listing__side">
            <div className="ws-listing__summary">
              <ListingSummary listing={listing} location={location} />
            </div>
            <div className="ws-listing__contact" id="contact-panel">
              <ContactSeller listing={listing} />
              <HowBuyingWorks />
              <SellerCard store={listing.store} />
            </div>
          </div>
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
