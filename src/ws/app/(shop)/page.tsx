import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { getHidden } from "@ws/features/hidden/server";
import { CategoryTiles } from "@ws/features/home/CategoryTiles";
import { HeroCarousel } from "@ws/features/home/HeroCarousel";
import { getRecentlyViewed } from "@ws/features/recent/server";
import { ProductRail } from "@ws/features/home/ProductRail";
import { SellCta } from "@ws/features/home/SellCta";
import { setLocation } from "@ws/features/location/actions";
import { LocationBar } from "@ws/features/location/LocationBar";
import { getAnchor } from "@ws/features/location/server";
import { HERO_SLIDES } from "@ws/lib/copy/trust";
import { repos } from "@ws/lib/data";
import { formatCount } from "@ws/lib/format";
import { categoryTiles, homeRails, nearbyCount } from "@ws/lib/home";
import { first } from "@ws/lib/search/params";
import { parseRadius, radiusParam } from "@ws/lib/search/radius";

/* SCR-001 Home (flows B1, spec §4): location first (search is in the header),
   categories with honest counts, Recently viewed and Near you, then the hero (moved
   below Near you and the trust strip removed, owner's direction 7 Oct), then rails in B1 order with every listing shown once (R-013) and short rails left
   out (R-014). The radius is in the URL (R-011), as on /search. Header, category
   rail, Recently viewed and Because you saved arrive with Phases 1 and 2. */

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const radius = parseRadius(params.radius);
  const [{ anchor, inferred }, hidden, categories, listings, recent] = await Promise.all([
    getAnchor(),
    getHidden(),
    repos.categories.list(),
    repos.listings.list(),
    getRecentlyViewed(),
  ]);
  const input = { listings, anchor, radius, hidden };
  const tiles = categoryTiles({ ...input, categories });
  const rails = homeRails({ ...input, recent });
  const total = nearbyCount(input);

  const place = anchor.label;
  const scope = radius === null ? "across Nigeria" : `near ${place}`;
  // Links keep the buyer's radius, so the next page shows what this one promised.
  const search = (query = "") => {
    const qs = new URLSearchParams(query);
    if (radius !== rules.location.defaultRadiusKm) qs.set("radius", radiusParam(radius));
    const s = qs.toString();
    return s ? `/search?${s}` : "/search";
  };
  const returnTo = first(params.radius) ? `/?radius=${radiusParam(radius)}` : "/";

  return (
    <div className="ws-home">
      {/* F11: one h1. The hero's slides are h2s because they rotate. */}
      <h1 className="cx-sr-only">WorldStore Marketplace: buy and sell near you</h1>
      <LocationBar anchor={anchor} inferred={inferred} radius={radius} returnTo={returnTo} action={setLocation} />
      <CategoryTiles tiles={tiles} radius={radius} />
      {/* B1: returning buyers see what they looked at first; other rails skip those (R-013). */}
      {rails.recent && (
        <ProductRail
          id="recent"
          eyebrow="Pick up where you left off"
          title="Recently viewed"
          seeAll={{ href: "/saved", label: "Saved", srLabel: "listings" }}
          listings={rails.recent.listings}
          anchor={anchor}
        />
      )}

      {rails.near && (
        <ProductRail
          id="near"
          eyebrow={radius === null ? "Nationwide, nearest first" : `Within ${radius} km of ${place}`}
          title={radius === null ? "Across Nigeria" : "Near you"}
          seeAll={{ href: search("sort=nearest"), srLabel: `listings ${scope}, nearest first` }}
          listings={rails.near.listings}
          anchor={anchor}
        />
      )}
      {rails.nationwide && (
        <ProductRail
          id="nationwide"
          eyebrow={`Nothing within ${radius} km of ${place} yet`}
          title="From sellers across Nigeria"
          seeAll={{ href: "/search?radius=all", srLabel: "listings across Nigeria" }}
          listings={rails.nationwide.listings}
          anchor={anchor}
        />
      )}
      {/* The hero sits after the first rail (owner's direction, 7 Oct): listings first. */}
      <HeroCarousel slides={HERO_SLIDES} />
      {rails.deals && (
        <ProductRail
          id="deals"
          eyebrow="Price drops"
          title={`Deals ${scope}`}
          seeAll={{ href: search("sort=discount"), srLabel: `listings ${scope}, biggest discount first` }}
          listings={rails.deals.listings}
          anchor={anchor}
        />
      )}

      <SellCta />

      {rails.new && (
        <ProductRail
          id="new"
          eyebrow="Newest first"
          title={`Just listed ${scope}`}
          seeAll={{ href: search("sort=newest"), srLabel: `listings ${scope}, newest first` }}
          listings={rails.new.listings}
          anchor={anchor}
        />
      )}
      {total > 0 && (
        <p className="ws-home__all">
          <Link href={search()} className={buttonClass({ variant: "ghost", arrow: true })}>
            Browse all {formatCount(total)} listings {scope}
            <ArrowRightIcon />
          </Link>
        </p>
      )}
    </div>
  );
}
