import { useEffect, useState } from 'react';
import { useBrowseFilters } from '@/features/listings/hooks/useBrowseFilters';
import { useBrowseCategories } from '@/features/listings/hooks/useBrowseCategories';
import { useBrowseListings } from '@/features/listings/hooks/useBrowseListings';
import { useBrowseTokens } from '@/features/listings/hooks/useBrowseTokens';
import { useLocations } from '@/shared/hooks/useLocations';
import { usePageTitle } from '@/shared/hooks/usePageTitle';
import BrowseHero from '@/features/listings/components/browse/BrowseHero';
import BrowseFilters from '@/features/listings/components/browse/BrowseFilters';
import BrowseResults from '@/features/listings/components/browse/BrowseResults';

const DESKTOP = '(min-width: 1024px)';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!filtersOpen) return;
    const mq = window.matchMedia(DESKTOP);
    if (mq.matches) return;
    const close = () => setFiltersOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', close);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', close);
    };
  }, [filtersOpen]);

  const eyebrow = search ? 'Search results' : isLeaf && parent ? parent.name : 'Marketplace';
  const title = search ? `“${search}”` : selected ? selected.name : 'Browse listings';
  const sub = search
    ? 'Matching listings across every category.'
    : selected
      ? `Every listing in ${selected.name}, from sellers you can message directly.`
      : 'Everything for sale right now. Message the seller and agree your own terms.';

  return (
    <>
      <BrowseHero
        eyebrow={eyebrow}
        title={title}
        sub={sub}
        parents={parents}
        activeParentId={openParentId}
        onPickCategory={(id) => setParam({ categoryId: id })}
      />

      <div className="ws-wrap">
        <div className="ws-browse">
          <BrowseFilters
            filters={browseFilters}
            subcategories={siblings}
            parentName={parent?.name}
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
