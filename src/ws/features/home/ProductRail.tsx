import { ListingCard } from "@ws/features/listing-card/ListingCard";
import type { Anchor } from "@ws/lib/areas";
import type { ListingWithSeller } from "@ws/lib/data/types";
import { RailFrame } from "./RailFrame";

/* ProductRail (spec §4): a row of rail cards with an eyebrow, a title and "See all".
   Rails come deduped and already collapsed under the minimum (lib/home.ts, R-013,
   R-014); cards show the distance from the buyer (NearYouRail). */

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  seeAll: { href: string; label?: string; srLabel: string };
  listings: readonly ListingWithSeller[];
  anchor: Anchor;
  now?: number;
};

export function ProductRail({ id, eyebrow, title, seeAll, listings, anchor, now }: Props) {
  const titleId = `rail-${id}`;
  return (
    <section className="ws-home-section ws-rail" aria-labelledby={titleId}>
      <RailFrame titleId={titleId} eyebrow={eyebrow} title={title} seeAll={{ label: "See all", ...seeAll }} count={listings.length}>
        {listings.map((listing) => (
          <li key={listing.id}>
            <ListingCard listing={listing} variant="rail" anchor={anchor} now={now} />
          </li>
        ))}
      </RailFrame>
    </section>
  );
}
