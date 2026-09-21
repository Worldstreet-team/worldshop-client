import { useHomeRails } from "@/features/listings/hooks/useHomeRails";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import HeroCarousel from "@/features/listings/components/HeroCarousel";
import ListingRail from "@/features/listings/components/ListingRail";
import FeaturedSellers from "@/features/listings/components/home/FeaturedSellers";
import SellBand from "@/features/listings/components/home/SellBand";
import Assurances from "@/features/listings/components/home/Assurances";

export default function Home() {
  usePageTitle();
  const { vehiclesId, total, newest, sellers, loading, sellersLoading } =
    useHomeRails();

  return (
    <>
      <HeroCarousel
        motorsTo={
          vehiclesId ? `/listings?categoryId=${vehiclesId}` : "/listings"
        }
        stat={total}
      />

      <div className="ws-wrap">
        <div className="ws-home">
          <ListingRail
            id="home-newest"
            eyebrow="Just listed"
            title="New arrivals"
            sub="The most recent listings across every category."
            to="/listings"
            items={newest}
            loading={loading}
          />
          <FeaturedSellers sellers={sellers} loading={sellersLoading} />
          <SellBand />
          <Assurances />
        </div>
      </div>
    </>
  );
}
