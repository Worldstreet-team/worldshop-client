import { X } from "lucide-react";
import type { Category, CategoryAttribute } from "@/features/catalog/types";
import type { BrowseFilters as Filters } from "@/features/listings/hooks/useBrowseFilters";

const CONDITIONS = ["NEW", "USED", "REFURBISHED"] as const;

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

type BrowseFiltersProps = {
  filters: Filters;
  subcategories: Category[];
  parentName?: string;
  needsSubcategory: boolean;
  facets: CategoryAttribute[];
  countryName: string;
  activeCount: number;
  total: number;
  open: boolean;
  onClose: () => void;
};

export default function BrowseFilters({
  filters,
  subcategories,
  parentName,
  needsSubcategory,
  facets,
  activeCount,
  total,
  open,
  onClose,
}: BrowseFiltersProps) {
  const {
    categoryId,
    condition,
    attrFilters,
    setParam,
    clearAll,
    priceDraft,
    setPriceDraft,
    applyPrice,
  } = filters;
  const openParentId = subcategories[0]?.parentId ?? "";

  return (
    <>
      <div
        className={`ws-drawer__scrim ws-filters__scrim${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="browse-filters"
        className={`ws-filters${open ? " is-open" : ""}`}
        aria-labelledby="browse-filters-title"
      >
        <div className="ws-filters__head">
          <h2 className="ws-filters__title" id="browse-filters-title">
            Filters
          </h2>
          {activeCount > 0 && (
            <button
              type="button"
              className="ws-filters__reset"
              onClick={clearAll}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className="ws-iconbtn ws-filters__close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <div className="ws-filters__body">
          {subcategories.length > 0 && (
            <details className="ws-filters__group" open>
              <summary className="ws-filters__legend">
                {parentName ?? "Subcategory"}
              </summary>
              <ul className="ws-subcats">
                {subcategories.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`ws-subcat${c.id === categoryId ? " is-active" : ""}`}
                      onClick={() =>
                        setParam({
                          categoryId: c.id === categoryId ? openParentId : c.id,
                        })
                      }
                      aria-pressed={c.id === categoryId}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
              {needsSubcategory && (
                <p className="ws-filters__hint">
                  Pick a subcategory to filter by brand, size and other details.
                </p>
              )}
            </details>
          )}

          <details className="ws-filters__group" open>
            <summary className="ws-filters__legend">Condition</summary>
            <div className="ws-chiprow" role="group" aria-label="Condition">
              <button
                type="button"
                className="ws-chip"
                aria-pressed={!condition}
                onClick={() => setParam({ condition: null })}
              >
                Any
              </button>
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="ws-chip"
                  aria-pressed={condition === c}
                  onClick={() =>
                    setParam({ condition: condition === c ? null : c })
                  }
                >
                  {titleCase(c)}
                </button>
              ))}
            </div>
          </details>

          <details className="ws-filters__group" open>
            <summary className="ws-filters__legend">Price (₦)</summary>
            <form
              className="ws-pricerange"
              onSubmit={(e) => {
                e.preventDefault();
                applyPrice();
              }}
            >
              <input
                className="ws-field ws-num"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Min"
                value={priceDraft.min}
                onChange={(e) =>
                  setPriceDraft((d) => ({ ...d, min: e.target.value }))
                }
                onBlur={applyPrice}
                aria-label="Minimum price"
              />
              <span aria-hidden>–</span>
              <input
                className="ws-field ws-num"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Max"
                value={priceDraft.max}
                onChange={(e) =>
                  setPriceDraft((d) => ({ ...d, max: e.target.value }))
                }
                onBlur={applyPrice}
                aria-label="Maximum price"
              />
              <button type="submit" hidden aria-hidden tabIndex={-1} />
            </form>
          </details>

          {facets.map((attr) => (
            <details className="ws-filters__group" key={attr.name} open>
              <summary className="ws-filters__legend">{attr.name}</summary>
              <select
                className="ws-select"
                value={attrFilters[attr.name] ?? ""}
                onChange={(e) =>
                  setParam({ [`attr.${attr.name}`]: e.target.value })
                }
                aria-label={attr.name}
              >
                <option value="">Any {attr.name.toLowerCase()}</option>
                {attr.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </details>
          ))}
        </div>

        <div className="ws-filters__foot">
          <button
            type="button"
            className="ws-btn ws-btn--primary ws-filters__done"
            onClick={onClose}
          >
            Show {total.toLocaleString("en-NG")}{" "}
            {total === 1 ? "listing" : "listings"}
          </button>
        </div>
      </aside>
    </>
  );
}
