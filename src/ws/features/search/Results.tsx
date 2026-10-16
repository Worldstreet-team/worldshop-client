import Link from "next/link";
import { MagnifyingGlassIcon, WarningIcon, XmarkCircleIcon } from "@ws/components/icons";
import { RollingCount } from "@ws/components/motion/RollingCount";
import { EmptyState, buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import type { Anchor } from "@ws/lib/areas";
import type { Category } from "@ws/lib/data/types";
import { formatCount, plural } from "@ws/lib/format";
import { clearAll, filterChips, groupName, removeGroup } from "@ws/lib/search/filter-labels";
import type { FilterKey, Filters } from "@ws/lib/search/filters";
import { hrefSet, hrefWith, type SearchParams } from "@ws/lib/search/params";
import { radiusLabel, radiusParam, widerRadius, type Radius } from "@ws/lib/search/radius";
import type { ReactNode } from "react";

/* Results page parts (spec §6, flows B2): ResultsHeader, ActiveFilterChips,
   ZeroResults and the end-of-list nudge. Every suggestion is a plain link that changes
   the URL (R-011). */

type HeaderProps = {
  query: string;
  anchor: Anchor;
  total: number;
  shown: number;
  sortMenu: ReactNode;
  /** False for EC-004: "No results for “x”" without naming a place. */
  near?: boolean;
};

/**
 * The page's one h1 says what was found and where (spec §6, NN/g): "2 results for
 * “head”", "32 listings near Lagos", or "No results for “sofa” near Lagos".
 */
export function ResultsHeader({ query, anchor, total, shown, sortMenu, near = true }: HeaderProps) {
  const title =
    total === 0
      ? query
        ? <>No results for “{query}”{near && ` near ${anchor.label}`}</>
        : `Nothing listed near ${anchor.label} yet`
      : query
        ? <><RollingCount value={total} /> {total === 1 ? "result" : "results"} for “{query}”</>
        : <><RollingCount value={total} /> {total === 1 ? "listing" : "listings"} near {anchor.label}</>;
  return (
    <div className="ws-results-head">
      <div>
        <h1 className="ws-results-head__title">
          {title}
        </h1>
        {/* Always there and polite, so "Show more" is announced as the count grows. */}
        <p className="ws-results-head__count" aria-live="polite">
          {shown < total ? `Showing ${formatCount(shown)} of ${formatCount(total)}` : null}
        </p>
      </div>
      {total > 0 && sortMenu}
    </div>
  );
}

type ChipsProps = { filters: Filters; categories: readonly Category[]; pathname: string; params: SearchParams };

/** Active filters, one removable chip per value, plus Clear all (spec §6, Baymard applied filters). */
export function ActiveFilterChips({ filters, categories, pathname, params }: ChipsProps) {
  const chips = filterChips(filters, categories);
  if (chips.length === 0) return null;
  return (
    <ul className="ws-filter-chips" aria-label="Active filters">
      {chips.map((c) => (
        <li key={`${c.key}:${c.label}`}>
          <Link href={hrefSet(pathname, params, c.remove)} className="ws-filter-chip">
            <span className="cx-sr-only">Remove filter: </span>
            {c.label}
            <XmarkCircleIcon />
          </Link>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <Link href={hrefSet(pathname, params, clearAll())} className="ws-filter-chips__clear">
            Clear all
          </Link>
        </li>
      )}
    </ul>
  );
}

type ZeroProps = {
  anchor: Anchor;
  radius: Radius;
  radiusCounts: ReadonlyMap<Radius, number>;
  filterCounts: ReadonlyMap<FilterKey, number>;
  filters: Filters;
  categories: readonly Category[];
  pathname: string;
  params: SearchParams;
};

const radiusHref = (pathname: string, params: SearchParams, r: Radius) =>
  hrefWith(pathname, params, "radius", r === rules.location.defaultRadiusKm ? null : radiusParam(r));

/**
 * ZeroResults (flows B2, NN/g no-results): the h1 already says nothing was found, so
 * this names the next step: widen the area or drop a filter (each with its count), or
 * try another word. Only suggestions that find something are offered.
 */
export function ZeroResults({ anchor, radius, radiusCounts, filterCounts, filters, categories, pathname, params }: ZeroProps) {
  const wider = widerRadius(radius, radiusCounts, 0);
  const drops = [...filterCounts].filter(([, n]) => n > 0);
  const nameOf = (k: FilterKey) => groupName(k, filters, categories);
  const dropHref = (k: FilterKey) => hrefSet(pathname, params, removeGroup(k));
  const title = wider !== undefined ? "Try a wider area" : drops.length > 0 ? "Try removing a filter" : "Try a different word, or browse a category";

  return (
    <EmptyState icon={<MagnifyingGlassIcon />} title={title} headingLevel="h2">
      <span className="ws-zero">
        {wider !== undefined && (
          <Link href={radiusHref(pathname, params, wider)} className={buttonClass({ variant: "ghost", size: "sm" })}>
            {plural(radiusCounts.get(wider)!, "result")} {wider === null ? "nationwide" : `within ${radiusLabel(wider)}`}
          </Link>
        )}
        {drops.map(([k, n]) => (
          <Link key={k} href={dropHref(k)} className={buttonClass({ variant: "quiet", size: "sm" })}>
            Remove {nameOf(k)} ({plural(n, "result")})
          </Link>
        ))}
        {wider === undefined && drops.length === 0 && (
          <span className="ws-zero__cats">
            Nothing near {anchor.label} matches yet. Browse{" "}
            {categories.slice(0, 4).map((c, i) => (
              <span key={c.id}>
                {i > 0 && ", "}
                <Link href={`/search?cat=${c.id}`}>{c.name}</Link>
              </span>
            ))}
            .
          </span>
        )}
      </span>
    </EmptyState>
  );
}

type EndProps = {
  total: number;
  radius: Radius;
  radiusCounts: ReadonlyMap<Radius, number>;
  pathname: string;
  params: SearchParams;
};

/**
 * After the last result: say the list is complete, and if a wider area has more, offer
 * it with the count ("3 more results nationwide").
 */
export function EndOfResults({ total, radius, radiusCounts, pathname, params }: EndProps) {
  const wider = widerRadius(radius, radiusCounts, total);
  const showAll = total > rules.search.pageSize;
  if (wider === undefined && !showAll) return null;
  return (
    <div className="ws-results-end">
      <p>
        {showAll ? `You've seen all ${formatCount(total)} results` : "That's everything"}
        {radius !== null && ` within ${radiusLabel(radius)}`}.
      </p>
      {wider !== undefined && (
        <Link href={radiusHref(pathname, params, wider)} className={buttonClass({ variant: "ghost", size: "sm" })}>
          {plural(radiusCounts.get(wider)! - total, "more result")} {wider === null ? "nationwide" : `within ${radiusLabel(wider)}`}
        </Link>
      )}
    </div>
  );
}

/** EC-004: the h1 says "No results"; one neutral line and the policy link, no suggestions. */
export function ProhibitedResults() {
  return (
    <div className="ws-prohibited">
      <WarningIcon />
      <p>
        Some items can&apos;t be sold on WorldStore. <Link href="/help/prohibited-items">See what isn&apos;t allowed</Link>.
      </p>
    </div>
  );
}
