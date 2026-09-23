import { Link } from "react-router-dom";
import { useCategories } from "@/features/catalog/hooks/useCategories";

/**
 * "Shop by category", ported from the design sandbox: a scrolling row of tall
 * photo tiles, the name and a listing count sitting over a scrim at the bottom.
 *
 * Only departments that have a photo are shown. A tile with no image is a flat
 * grey box with white text on it, which reads as a loading failure rather than
 * a category, so it is better left out than shipped empty.
 */

const PHOTOS: Record<string, string> = {
  fashion: "/img/cat/fashion.jpg",
  electronics: "/img/cat/electronics.jpg",
  home: "/img/cat/home.jpg",
  sports: "/img/cat/sports.jpg",
  vehicles: "/img/cat/vehicles.jpg",
};

function photoFor(name: string): string | undefined {
  const n = name.toLowerCase();
  if (/fashion|cloth|wear/.test(n)) return PHOTOS.fashion;
  if (/electronic|phone|tablet|computer|laptop/.test(n)) return PHOTOS.electronics;
  if (/home|furniture|appliance/.test(n)) return PHOTOS.home;
  if (/sport|fitness|outdoor/.test(n)) return PHOTOS.sports;
  if (/vehicle|car|auto/.test(n)) return PHOTOS.vehicles;
  return undefined;
}

export default function CategoryRail() {
  const { categories } = useCategories();

  const tiles = categories
    .filter((c) => !c.parentId)
    .map((c) => ({ ...c, photo: photoFor(c.name) }))
    .filter((c) => c.photo)
    .slice(0, 6);

  if (tiles.length === 0) return null;

  return (
    <section className="ws-carousel ws-carousel--categories" aria-label="Shop by category">
      <header className="ws-railhead">
        <div className="ws-railhead__text">
          <h2 className="ws-railhead__title">Shop by category</h2>
          <p className="ws-railhead__sub">
            {tiles.length === 6 ? "Six of them" : `${tiles.length} of them`} cover almost
            everything listed today.
          </p>
        </div>
      </header>

      <div className="ws-carousel__track">
        {tiles.map((c) => (
          <div className="ws-carousel__item" key={c.id}>
            <Link to={`/listings?categoryId=${c.id}`} className="ws-tile">
              <img className="ws-tile__art" src={c.photo} alt="" loading="lazy" />
              <div className="ws-tile__scrim" aria-hidden />
              <span className="ws-tile__name">{c.name}</span>
              {typeof c.productCount === "number" && (
                <span className="ws-tile__count ws-num">
                  {c.productCount.toLocaleString("en-NG")} listings
                </span>
              )}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
