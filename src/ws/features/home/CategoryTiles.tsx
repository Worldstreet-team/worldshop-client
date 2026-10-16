import Link from "next/link";
import { RevealOnScroll } from "@ws/components/motion/RevealOnScroll";
import { rules } from "@ws/config/marketplace-rules";
import { formatCount } from "@ws/lib/format";
import type { CategoryTile } from "@ws/lib/home";
import { radiusParam, type Radius } from "@ws/lib/search/radius";
import { categoryIcon } from "./category-icons";

/* CategoryTiles (spec §4 "Whatever you're into", flows B1 "shop by category"): icon
   tile, name and count. The count is exactly what the category's search shows near
   the buyer (R-016); with nothing nearby it says "nationwide" and opens the nationwide
   results, so the number on the tile is always the number on the next page. */

function countLabel({ count, scope }: CategoryTile, radius: Radius) {
  if (count === 0) return "None listed yet";
  return scope === "radius" && radius !== null ? `${formatCount(count)} nearby` : `${formatCount(count)} nationwide`;
}

/** The search the tile's number came from: same category, same radius. */
function tileHref({ category, scope }: CategoryTile, radius: Radius) {
  const r = scope === "nationwide" ? null : radius;
  return r === rules.location.defaultRadiusKm ? `/search?cat=${category.id}` : `/search?cat=${category.id}&radius=${radiusParam(r)}`;
}

export function CategoryTiles({ tiles, radius }: { tiles: readonly CategoryTile[]; radius: Radius }) {
  return (
    <section className="ws-home-section" aria-labelledby="home-categories">
      <div className="ws-home-head">
        <h2 id="home-categories" className="ws-home-head__title">
          Shop by category
        </h2>
      </div>
      <RevealOnScroll count={tiles.length}>
        <ul className="ws-tiles">
          {tiles.map((tile) => {
            const Icon = categoryIcon(tile.category.id);
            return (
              <li key={tile.category.id}>
                <Link href={tileHref(tile, radius)} className="cx-card cx-lit cx-card--interactive ws-tile">
                  <span className="cx-lit-2" aria-hidden="true" />
                  <span className="ws-tile__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="ws-tile__name">{tile.category.name}</span>
                  <span className="ws-tile__count">{countLabel(tile, radius)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </RevealOnScroll>
    </section>
  );
}
