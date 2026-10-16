import { CheckCircleIcon, NavigateArrowUpDownIcon } from "@ws/components/icons";
import { Menu } from "@ws/components/ui";
import { hrefWith, type SearchParams } from "@ws/lib/search/params";
import { SORTS, sortLabel, type SortKey } from "@ws/lib/search/sort";

/* SortMenu (spec §6), eBay's "Sort: Best match ▾". Each order is a link that changes
   ?sort= and keeps the other filters, so the server renders the result and Back
   returns to the previous order (R-011). The current order is a checked radio item. */

type Props = { current: SortKey; pathname: string; params: SearchParams };

export function SortMenu({ current, pathname, params }: Props) {
  return (
    <Menu
      label={`Sort: ${sortLabel(current)}`}
      iconOnly={false}
      variant="ghost"
      sheetTitle="Sort by"
      trigger={
        <>
          <NavigateArrowUpDownIcon />
          <span>
            Sort<span className="ws-sort__current">: {sortLabel(current)}</span>
          </span>
          {/* On phones the label is just "Sort"; the dot says a non-default order is on. */}
          {current !== "best" && <span className="ws-sort__dot" aria-hidden="true" />}
        </>
      }
      items={SORTS.map(({ key, label }) => ({
        label,
        href: hrefWith(pathname, params, "sort", key === "best" ? null : key),
        checked: key === current,
        icon: key === current ? <CheckCircleIcon /> : <span className="ws-menu-spacer" aria-hidden="true" />,
      }))}
    />
  );
}
