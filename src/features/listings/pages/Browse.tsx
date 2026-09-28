import { useBrowseFilters } from '@/features/listings/hooks/useBrowseFilters';
import { useBrowseCategories } from '@/features/listings/hooks/useBrowseCategories';
import { useBrowseListings } from '@/features/listings/hooks/useBrowseListings';
import { useBrowseTokens } from '@/features/listings/hooks/useBrowseTokens';
import { useLocations } from '@/shared/hooks/useLocations';
import { useFilterDrawer } from '@/shared/hooks/useFilterDrawer';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import BrowseHeader from '@/features/listings/components/browse/BrowseHeader';
import BrowseFilters from '@/features/listings/components/browse/BrowseFilters';
import BrowseResults from '@/features/listings/components/browse/BrowseResults';

export default function Browse() {
  const browseFilters = useBrowseFilters();
  const { categoryId, countryFilter, stateFilter, search, page, sort, setParam, clearAll } =
    browseFilters;
  const { countryOf } = useLocations();
  const countryName = countryFilter ? (countryOf(countryFilter)?.name ?? countryFilter) : '';
  const { categories, parents, selected, openParentId, siblings, isLeaf, facets } =
    useBrowseCategories(categoryId);
  const parent = parents.find((c) => c.id === openParentId);
  usePageTitle(search ? `“${search}”` : selected ? selected.name : 'Browse listings');
  const results = useBrowseListings(browseFilters, categories);
  const tokens = useBrowseTokens(browseFilters, selected, countryName);
  const { open: filtersOpen, setOpen: setFiltersOpen } = useFilterDrawer();

  const title = search
    ? `Results for “${search}”`
    : selected
      ? selected.name
      : 'All listings';

  return (
    <>
      <div className="ws-wrap">
        <BrowseHeader title={title} parent={parent} selected={selected} search={search} />

        <div className="ws-browse">
          <BrowseFilters
            filters={browseFilters}
            parents={parents}
            subcategories={siblings}
            parentName={parent?.name}
            openParentId={openParentId}
            needsSubcategory={Boolean(categoryId) && !isLeaf}
            facets={facets}
            countryName={countryName}
            activeCount={tokens.length}
            total={results.total}
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />

          <BrowseResults
            {...results}
            tokens={tokens}
            place={stateFilter || countryName}
            page={page}
            sort={sort}
            filtersOpen={filtersOpen}
            onSort={(s) => setParam({ sort: s })}
            onPage={(p) => setParam({ page: String(p) }, { keepPage: true })}
            onOpenFilters={() => setFiltersOpen(true)}
            onClearAll={clearAll}
          />
        </div>
      </div>
    </>
  );
}
