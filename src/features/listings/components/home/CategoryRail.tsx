import { Link } from "react-router-dom";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { departmentsWithStock , listingCount } from "@/features/catalog/categoryTree";

/**
 * "Shop by category", ported from the design sandbox: a scrolling row of tall
 * photo tiles, the name and a listing count sitting over a scrim at the bottom.
 *
 * Only departments that have a photo are shown. A tile with no image is a flat
 * grey box with white text on it, which reads as a loading failure rather than
 * a category, so it is better left out than shipped empty.
 */

// One photo per department, matched on its name. The first five are the
// design sandbox's own; the rest are public-domain photos (CC0 / no known
// copyright) chosen to match the live API's departments, each checked by eye.
// Sources are listed in public/img/cat/CREDITS.md.
const PHOTO = (file: string) => `/img/cat/${file}`;

// Order matters: "Healthy" before "Health", and whole words for cars, since a
// bare /car/ matches "Personal Care".
const RULES: Array<[RegExp, string]> = [
  [/healthy/, PHOTO("healthy.jpg")],
  [/phone|tablet|mobile/, PHOTO("phones.jpg")],
  [/beauty|personal care|cosmetic/, PHOTO("beauty.jpg")],
  [/health|fitness|gym/, PHOTO("fitness.jpg")],
  [/food|agric|grocer/, PHOTO("food.webp")],
  [/propert|real estate|\bland\b/, PHOTO("property.jpg")],
  [/baby|kid|child/, PHOTO("baby.webp")],
  [/business|industrial|office/, PHOTO("business.jpg")],
  [/service/, PHOTO("services.jpg")],
  [/book|media|hobb/, PHOTO("books.jpg")],
  [/\bpets?\b|animal/, PHOTO("pets.jpg")],
  [/fashion|cloth|wear/, PHOTO("fashion.jpg")],
  [/electronic|computer|laptop/, PHOTO("electronics.jpg")],
  [/home|furniture|appliance/, PHOTO("home.jpg")],
  [/sport|outdoor/, PHOTO("sports.jpg")],
  [/vehicle|\bcars?\b|\bauto/, PHOTO("vehicles.jpg")],
];

function photoFor(name: string): string | undefined {
  const n = name.toLowerCase();
  return RULES.find(([re]) => re.test(n))?.[1];
}

export default function CategoryRail() {
  const { categories } = useCategories();

  const tiles = departmentsWithStock(categories)
    .map((c) => ({ ...c, photo: photoFor(c.name) }))
    .filter((c) => c.photo)
    .slice(0, 6);

  if (tiles.length === 0) return null;

  return (
    <section className="ws-carousel" aria-label="Shop by category">
      <header className="ws-railhead">
        <div className="ws-railhead__text">
          <h2 className="ws-railhead__title">Shop by category</h2>
          <p className="ws-railhead__sub">
            {tiles.length === 6 ? "Six of them" : `${tiles.length} of them`} cover almost
            everything listed today.
          </p>
        </div>
      </header>

      <div className="ws-carousel__track ws-carousel__track--categories">
        {tiles.map((c) => (
          <div className="ws-carousel__item" key={c.id}>
            <Link to={`/categories/${c.slug}`} className="ws-tile">
              <img className="ws-tile__art" src={c.photo} alt="" loading="lazy" />
              <div className="ws-tile__scrim" aria-hidden />
              <span className="ws-tile__name">{c.name}</span>
              {/* Only when there is something to count. A department whose
                  count has not been aggregated reads "0 listings", which
                  advertises an empty shop rather than saying nothing. */}
              <span className="ws-tile__count ws-num">
                {listingCount(c.total)}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
