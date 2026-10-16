import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import type { Category } from "@ws/lib/data/types";
import { formatCount } from "@ws/lib/format";
import { MULTI_GROUPS, WITHIN_OPTIONS, type FilterKey, type Filters } from "@ws/lib/search/filters";
import { clearAll } from "@ws/lib/search/filter-labels";
import { first, hrefSet, type SearchParams } from "@ws/lib/search/params";
import { RADII, radiusLabel, radiusParam, type Radius } from "@ws/lib/search/radius";
import { FilterEnhancer } from "./FilterEnhancer";

/*
 * FilterRail / FilterSheet body (spec §6, flows B2 "Filters (v1)"): one GET form, so it
 * works before scripts load. Groups are FilterGroups (open by default); options are
 * FacetCheckboxes with counts that already account for every other filter and the
 * radius (R-016), disabled at 0 unless chosen. Categories and price presets are links.
 * On the desktop rail, ticking applies straight away; the phone sheet applies with
 * "Show N results", whose number updates as you tick (FilterEnhancer).
 */

type Props = {
  id: string;
  variant: "rail" | "sheet";
  filters: Filters;
  facets: ReadonlyMap<FilterKey, ReadonlyMap<string, number>>;
  radius: Radius;
  radiusCounts: ReadonlyMap<Radius, number>;
  total: number;
  categories: readonly Pick<Category, "id" | "name">[];
  params: SearchParams;
};

const PATH = "/search";

function Group({ title, selected = 0, children }: { title: string; selected?: number; children: ReactNode }) {
  return (
    <details className="ws-fgroup" open>
      <summary className="ws-fgroup__title">
        {title}
        {selected > 0 && <span className="ws-fgroup__count">{selected} selected</span>}
      </summary>
      <div className="ws-fgroup__body">{children}</div>
    </details>
  );
}

const nairaShort = (n: number) => (n >= 1_000_000 ? `₦${n / 1_000_000}m` : `₦${n / 1_000}k`);
const presetLabel = ([lo, hi]: readonly [number | null, number | null]) => (lo === null ? `Under ${nairaShort(hi!)}` : hi === null ? `Over ${nairaShort(lo)}` : `${nairaShort(lo)}–${nairaShort(hi)}`);

export function FilterPanel({ id, variant, filters, facets, radius, radiusCounts, total, categories, params }: Props) {
  const q = first(params.q);
  const sort = first(params.sort);
  const count = (key: FilterKey, value: string) => facets.get(key)?.get(value) ?? 0;
  const catCounts = categories.map((c) => ({ ...c, n: count("cat", c.id) })).filter((c) => c.n > 0 || c.id === filters.cat);

  return (
    <Form action={PATH} id={id} className={`ws-filters ws-filters--${variant}`} aria-label="Filters">
      {q && <input type="hidden" name="q" value={q} />}
      {sort && <input type="hidden" name="sort" value={sort} />}
      {filters.cat && <input type="hidden" name="cat" value={filters.cat} />}

      <Group title="Category" selected={filters.cat ? 1 : 0}>
        <ul className="ws-ftree">
          <li>
            <Link href={hrefSet(PATH, params, { cat: null })} aria-current={!filters.cat ? "true" : undefined}>
              All categories
            </Link>
          </li>
          {catCounts.map((c) => (
            <li key={c.id}>
              <Link href={hrefSet(PATH, params, { cat: c.id })} aria-current={filters.cat === c.id ? "true" : undefined}>
                {c.name} <span className="ws-facet__n">({formatCount(c.n)})</span>
              </Link>
            </li>
          ))}
        </ul>
      </Group>

      <Group title="Price" selected={filters.min !== undefined || filters.max !== undefined ? 1 : 0}>
        <ul className="ws-fpresets">
          {rules.search.pricePresets.map((p) => (
            <li key={presetLabel(p)}>
              <Link
                className="ws-fpreset"
                href={hrefSet(PATH, params, { min: p[0] === null ? null : String(p[0]), max: p[1] === null ? null : String(p[1]) })}
              >
                {presetLabel(p)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ws-fprice">
          <label>
            <span>Min (₦)</span>
            <input type="number" name="min" inputMode="numeric" min={0} step={1} defaultValue={filters.min !== undefined ? filters.min / 100 : ""} />
          </label>
          <label>
            <span>Max (₦)</span>
            <input type="number" name="max" inputMode="numeric" min={0} step={1} defaultValue={filters.max !== undefined ? filters.max / 100 : ""} />
          </label>
          {variant === "rail" && (
            <button type="submit" className={buttonClass({ variant: "ghost", size: "sm" })}>
              Go
            </button>
          )}
        </div>
      </Group>

      <Group title="Distance" selected={radius === rules.location.defaultRadiusKm ? 0 : 1}>
        <fieldset className="ws-fopts">
          <legend className="cx-sr-only">Distance</legend>
          {RADII.map((r) => (
            <label key={radiusParam(r)} className="ws-facet">
              <input type="radio" name="radius" value={radiusParam(r)} defaultChecked={r === radius} />
              <span className="ws-facet__label">{r === null ? "Nationwide" : `Within ${radiusLabel(r)}`}</span>
              <span className="ws-facet__n">{formatCount(radiusCounts.get(r) ?? 0)}</span>
            </label>
          ))}
        </fieldset>
      </Group>

      {MULTI_GROUPS.map((g) => {
        const chosen = filters[g.key] ?? [];
        return (
          <Group key={g.key} title={g.label} selected={chosen.length}>
            <fieldset className="ws-fopts">
              <legend className="cx-sr-only">{g.label}</legend>
              {g.options.map((o) => {
                const n = count(g.key, o.value);
                const on = (chosen as string[]).includes(o.value);
                return (
                  <label key={o.value} className="ws-facet" data-empty={n === 0 && !on ? "" : undefined}>
                    <input type="checkbox" name={g.key} value={o.value} defaultChecked={on} disabled={n === 0 && !on} />
                    <span className="ws-facet__label">{o.label}</span>
                    <span className="ws-facet__n">{formatCount(n)}</span>
                  </label>
                );
              })}
            </fieldset>
          </Group>
        );
      })}

      <Group title="Listed within" selected={filters.within ? 1 : 0}>
        <fieldset className="ws-fopts">
          <legend className="cx-sr-only">Listed within</legend>
          <label className="ws-facet">
            <input type="radio" name="within" value="" defaultChecked={!filters.within} />
            <span className="ws-facet__label">Any time</span>
          </label>
          {WITHIN_OPTIONS.map((o) => {
            const n = count("within", String(o.value));
            return (
              <label key={o.value} className="ws-facet" data-empty={n === 0 && filters.within !== o.value ? "" : undefined}>
                <input type="radio" name="within" value={o.value} defaultChecked={filters.within === o.value} disabled={n === 0 && filters.within !== o.value} />
                <span className="ws-facet__label">{o.label}</span>
                <span className="ws-facet__n">{formatCount(n)}</span>
              </label>
            );
          })}
        </fieldset>
      </Group>

      {variant === "rail" ? (
        <button type="submit" className={buttonClass({ variant: "ghost", block: true, className: "ws-filters__apply" })}>
          Apply filters
        </button>
      ) : (
        <div className="ws-filters__foot">
          <Link href={hrefSet(PATH, params, clearAll())} className={buttonClass({ variant: "quiet" })}>
            Clear all
          </Link>
          <button type="submit" className={buttonClass({ block: true, className: "ws-filters__show" })}>
            Show {formatCount(total)} {total === 1 ? "result" : "results"}
          </button>
        </div>
      )}
      <FilterEnhancer formId={id} live={variant === "sheet"} />
    </Form>
  );
}
