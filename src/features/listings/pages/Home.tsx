import { useHomeRails } from "@/features/listings/hooks/useHomeRails";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import HeroCarousel from "@/features/listings/components/HeroCarousel";
import ListingRail from "@/features/listings/components/ListingRail";
import CategoryRail from "@/features/listings/components/home/CategoryRail";
import SellBand from "@/features/listings/components/home/SellBand";
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
  const { vehiclesId, deals, newest, loading } = useHomeRails();

  return (
    <div className="ws-wrap">
      <div className="ws-home">
        {/* Promo and trust strip travel together: the strip answers the
            question the promo provokes, so they sit closer than a section. */}
        <section className="ws-home__featured" aria-label="Featured">
          <HeroCarousel
            motorsTo={vehiclesId ? `/listings?categoryId=${vehiclesId}` : "/listings"}
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
          sub="The keenest prices on the marketplace this week."
          to="/listings?sort=price_asc"
          items={deals}
          loading={loading}
        />

        <SellBand />
      </div>
    </div>
  );
}
