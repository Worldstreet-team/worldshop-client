import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicMarketplace } from "@/features/stores/api";
import type { Listing, PublicStore } from "@/features/stores/api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { MINUTE } from "@/app/providers/QueryProvider";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { departmentsWithStock } from "@/features/catalog/categoryTree";
import ListingCard from "@/features/listings/components/ListingCard";
import ListingCardSkeleton from "@/features/listings/components/ListingCardSkeleton";

type Row = Listing & { store: PublicStore };
const PAGE = 20;
const NO_ROWS: Row[] = [];

/**
 * The full grid under the rails: sort, department filter, and everything that
 * matched. The rails are editorial; this is the whole catalogue.
 *
 * Sorting happens here rather than on the server because the browse endpoint
 * sorts by price only through the same client-side path, and re-fetching a
 * page just to reorder twenty rows is a round trip for nothing.
 */

const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

export default function AllListings() {
  const [sort, setSort] = useState<SortKey>("recommended");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { categories } = useCategories();

  const departments = useMemo(
    () => departmentsWithStock(categories).slice(0, 8),
    [categories],
  );

  const query = useQuery({
    queryKey: queryKeys.listings({ limit: PAGE, categoryId: categoryId ?? undefined }),
    queryFn: () =>
      publicMarketplace.browse({ limit: PAGE, ...(categoryId ? { categoryId } : {}) }),
    staleTime: 5 * MINUTE,
  });

  const rows = query.data?.data ?? NO_ROWS;
  const total = query.data?.pagination.total ?? 0;

  // A copy, because sort mutates and the query cache holds this array.
  const sorted = useMemo(() => {
    if (sort === "recommended") return rows;
    return [...rows].sort((a, b) =>
      sort === "price_asc"
        ? (a.basePrice ?? Infinity) - (b.basePrice ?? Infinity)
        : (b.basePrice ?? -Infinity) - (a.basePrice ?? -Infinity),
    );
  }, [rows, sort]);

  return (
    <section id="all-listings" className="ws-all" aria-labelledby="all-listings-title">
      <div className="ws-all__head">
        <h2 className="ws-all__title" id="all-listings-title">
          All listings
        </h2>

        <div className="ws-all__controls">
          <p className="ws-all__count ws-num" aria-live="polite">
            {query.isPending
              ? "Loading listings…"
              : `${total.toLocaleString("en-NG")} ${total === 1 ? "listing" : "listings"}`}
          </p>

          {/* A segmented control, not a select: three options fit, and seeing
              them beats opening a menu to find out what the choices are. */}
          <div className="ws-segmented" role="group" aria-label="Sort listings">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sort === s.key}
                className={`ws-segmented__btn${sort === s.key ? " is-active" : ""}`}
                onClick={() => setSort(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {departments.length > 0 && (
        <div className="ws-all__pills" role="group" aria-label="Filter by category">
          <button
            type="button"
            aria-pressed={categoryId === null}
            className={`ws-pill${categoryId === null ? " is-active" : ""}`}
            onClick={() => setCategoryId(null)}
          >
            All
          </button>
          {departments.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              className={`ws-pill${categoryId === c.id ? " is-active" : ""}`}
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
              <span className="ws-pill__count ws-num">
                ({c.total.toLocaleString("en-NG")})
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="ws-results">
        {query.isPending
          ? Array.from({ length: 10 }, (_, i) => <ListingCardSkeleton key={i} showSeller />)
          : sorted.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
      </div>

      {!query.isPending && sorted.length === 0 && (
        <p className="ws-all__empty">
          Nothing listed here yet. Try another category.
        </p>
      )}
    </section>
  );
}
