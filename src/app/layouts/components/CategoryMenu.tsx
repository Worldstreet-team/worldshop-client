import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin } from "lucide-react";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { publicMarketplace } from "@/features/stores/api";
import { queryKeys } from "@/shared/lib/queryKeys";
import { MINUTE } from "@/app/providers/QueryProvider";
import { firstImage, priceLabel } from "@/features/listings/model";
import { departmentIcon } from "@/app/layouts/components/Header";

/**
 * The "All categories" mega-menu: departments, the subcategories of whichever
 * one you are pointing at, and a few real listings from it.
 *
 * The third column is the point of the thing. A menu of names asks you to guess
 * what a department holds; three actual listings with prices show you, and they
 * are reachable in one more click rather than two.
 *
 * Departments switch on hover and on focus, so a pointer and a keyboard walk
 * the same path.
 */

const FEATURED = 3;

export default function CategoryMenu({ onClose }: { onClose: () => void }) {
  const { categories, isLoading } = useCategories();
  const rootRef = useRef<HTMLDivElement>(null);

  const departments = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ?? departments[0]?.id ?? null;

  const children = useMemo(
    () => categories.filter((c) => c.parentId === active),
    [categories, active],
  );

  const activeName = departments.find((d) => d.id === active)?.name ?? "";

  const featured = useQuery({
    queryKey: queryKeys.listings({ categoryId: active ?? undefined, limit: FEATURED }),
    queryFn: () => publicMarketplace.browse({ categoryId: active, limit: FEATURED }),
    enabled: !!active,
    staleTime: 10 * MINUTE,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Next tick, or the click that opened this closes it again immediately.
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      clearTimeout(t);
    };
  }, [onClose]);

  if (isLoading || departments.length === 0) return null;

  const rows = featured.data?.data ?? [];

  return (
    <div className="ws-megamenu" ref={rootRef}>
      <div className="ws-megamenu__panel">
        <div className="ws-megamenu__col ws-megamenu__col--depts">
          {departments.map((d) => {
            const Icon = departmentIcon(d.name);
            return (
            <Link
              key={d.id}
              to={`/listings?categoryId=${d.id}`}
              className={`ws-megamenu__dept${d.id === active ? " is-active" : ""}`}
              onMouseEnter={() => setActiveId(d.id)}
              onFocus={() => setActiveId(d.id)}
              onClick={onClose}
            >
              <Icon size={16} aria-hidden className="ws-megamenu__icon" />
              <span className="ws-megamenu__deptbody">
                <span className="ws-megamenu__name">{d.name}</span>
                {typeof d.productCount === "number" && d.productCount > 0 && (
                  <span className="ws-megamenu__count ws-num">
                    {d.productCount.toLocaleString("en-NG")} listings
                  </span>
                )}
              </span>
              <ChevronRight size={14} aria-hidden className="ws-megamenu__chev" />
            </Link>
            );
          })}
        </div>

        <div className="ws-megamenu__col ws-megamenu__col--subs">
          {children.length > 0 ? (
            children.map((c) => (
              <Link
                key={c.id}
                to={`/listings?categoryId=${c.id}`}
                className="ws-megamenu__sub"
                onClick={onClose}
              >
                <span className="ws-megamenu__name">{c.name}</span>
                {typeof c.productCount === "number" && c.productCount > 0 && (
                  <span className="ws-megamenu__count ws-num">
                    {c.productCount.toLocaleString("en-NG")} listings
                  </span>
                )}
              </Link>
            ))
          ) : (
            // A department with no subcategories is browsable in its own right,
            // so offer that rather than an empty column.
            <Link
              to={`/listings?categoryId=${active}`}
              className="ws-megamenu__sub"
              onClick={onClose}
            >
              <span className="ws-megamenu__name">Browse all {activeName}</span>
            </Link>
          )}
        </div>

        <div className="ws-megamenu__col ws-megamenu__col--featured">
          <p className="ws-megamenu__heading">Featured in {activeName}</p>

          {featured.isPending ? (
            Array.from({ length: FEATURED }, (_, i) => (
              <span key={i} className="ws-megamenu__listing ws-megamenu__listing--skeleton" aria-hidden>
                <span className="ws-megamenu__thumb" />
                <span className="ws-megamenu__lines">
                  <span className="ws-skeleton" style={{ height: 13, width: "70%" }} />
                  <span className="ws-skeleton" style={{ height: 11, width: "40%" }} />
                </span>
              </span>
            ))
          ) : rows.length === 0 ? (
            <p className="ws-megamenu__empty">Nothing listed here yet.</p>
          ) : (
            rows.map((l) => {
              const img = firstImage(l);
              return (
                <Link
                  key={l.id}
                  to={`/listings/${l.slug || l.id}`}
                  className="ws-megamenu__listing"
                  onClick={onClose}
                >
                  {img ? (
                    <img className="ws-megamenu__thumb" src={img} alt="" loading="lazy" />
                  ) : (
                    <span className="ws-megamenu__thumb" aria-hidden />
                  )}
                  <span className="ws-megamenu__lines">
                    <span className="ws-megamenu__ltitle">{l.name}</span>
                    {(l.city || l.state) && (
                      <span className="ws-megamenu__lloc">
                        <MapPin size={11} aria-hidden />
                        {[l.city, l.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="ws-megamenu__lprice ws-num">{priceLabel(l)}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
