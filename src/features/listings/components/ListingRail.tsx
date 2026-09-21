import type { ListingWithStore } from "@/features/listings/model";
import Reveal from "@/shared/components/Reveal";
import Section from "@/shared/components/Section";
import type { SectionHeadProps } from "@/shared/components/SectionHead";
import ListingCard from "@/features/listings/components/ListingCard";
import ListingCardSkeleton from "@/features/listings/components/ListingCardSkeleton";

type ListingRailProps = Omit<SectionHeadProps, "action"> & {
  /** Target of the "See all" link. */
  to: string;
  items: ListingWithStore[];
  loading: boolean;
};

export default function ListingRail({
  to,
  items,
  loading,
  ...head
}: ListingRailProps) {
  // An empty rail is noise on a landing page — drop it rather than show a blank strip.
  if (!loading && items.length === 0) return null;
  return (
    <Section {...head} action={{ label: "See all", to }}>
      <div className="ws-rail__track ws-bleed">
        {loading
          ? Array.from({ length: 4 }, (_, i) => (
              <ListingCardSkeleton key={i} showSeller />
            ))
          : items.map((l, i) => (
              <Reveal className="ws-reveal" index={i} key={l.id}>
                <ListingCard listing={l} showSeller />
              </Reveal>
            ))}
      </div>
    </Section>
  );
}
