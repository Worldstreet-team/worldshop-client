import type { PublicStore } from "@/features/stores/api";
import Reveal from "@/shared/components/Reveal";
import Section from "@/shared/components/Section";
import StoreCard from "@/features/stores/components/StoreCard";
import StoreCardSkeleton from "@/features/stores/components/StoreCardSkeleton";

type FeaturedSellersProps = {
  sellers: PublicStore[];
  loading: boolean;
};

export default function FeaturedSellers({ sellers, loading }: FeaturedSellersProps) {
  if (!loading && sellers.length === 0) return null;
  return (
    <Section
      id="home-sellers"
      eyebrow="Sellers"
      title="Stores to know"
      sub="Rated stores with listings live on the marketplace right now."
      action={{ label: "See all", to: "/stores" }}
    >
      <div className="ws-sellers ws-bleed">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <StoreCardSkeleton key={i} />)
          : sellers.map((s, i) => (
              <Reveal className="ws-reveal" index={i} key={s.id}>
                <StoreCard store={s} />
              </Reveal>
            ))}
      </div>
    </Section>
  );
}
