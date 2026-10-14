import { useHomeRails } from "@/features/listings/hooks/useHomeRails";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import HeroCarousel from "@/features/listings/components/HeroCarousel";
import ListingRail from "@/features/listings/components/ListingRail";
import CategoryRail from "@/features/listings/components/home/CategoryRail";
import SellBand from "@/features/listings/components/home/SellBand";
import AllListings from "@/features/listings/components/home/AllListings";
import Assurances from "@/features/listings/components/home/Assurances";

/**
 * Homepage, ordered as the design sandbox orders it: the promo and the trust
 * strip as one unit, then categories, then the listing rails, then the pitch
 * to sellers.
 *
 * "Stores to know" is gone from here. The reference leads on listings rather
 * than on sellers, and a rail of stores above the first products pushed the
 * actual goods below the fold.
 */
export default function Home() {
  usePageTitle();
  const { vehiclesId, motors, deals, newest, loading } = useHomeRails();

  return (
    <div className="ws-wrap">
      <div className="ws-home">
        {/* The page's one H1, for screen readers and search engines. The
            design opens on the carousel, whose slide titles rotate and so
            cannot name the page; this one stays put without being drawn. */}
        <h1 className="ws-sr-only">WorldStore: buy and sell across Nigeria</h1>
        {/* Promo and trust strip travel together: the strip answers the
            question the promo provokes, so they sit closer than a section. */}
        <section className="ws-home__featured" aria-label="Featured">
          {/* The Motors slide promises vehicles, so it waits until there
              are some to show rather than leading into an empty category. */}
          <HeroCarousel
            motorsTo={motors.length > 0 ? `/listings?categoryId=${vehiclesId}` : null}
          />
          <Assurances />
        </section>

        <CategoryRail />

        <ListingRail
          id="home-newest"
          eyebrow="Just listed"
          title="New arrivals"
          sub="The most recent listings across every category."
          to="/listings"
          items={newest}
          loading={loading}
        />

        <ListingRail
          id="home-deals"
          eyebrow="Deals"
          title="Deals ending soon"
          sub="Prices sellers have cut, for a limited time."
          to="/listings?deals=1"
          items={deals}
          loading={loading}
        />

        <SellBand />

        <AllListings />
      </div>
    </div>
  );
}
