import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchX, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import ListingCard from '@/features/listings/components/ListingCard';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';
import { useBrowseFilters } from '@/features/listings/hooks/useBrowseFilters';
import { useBrowseCategories } from '@/features/listings/hooks/useBrowseCategories';
import { useBrowseListings } from '@/features/listings/hooks/useBrowseListings';
import { useBrowseTokens } from '@/features/listings/hooks/useBrowseTokens';
import { useLocations } from '@/shared/hooks/useLocations';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

const CONDITIONS = ['NEW', 'USED', 'REFURBISHED'] as const;

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function Browse() {
  const browseFilters = useBrowseFilters();
  const {
    categoryId, countryFilter, stateFilter, condition, search, page, sort, attrFilters,
    setParam, clearAll, priceDraft, setPriceDraft, applyPrice,
  } = browseFilters;

  const { countryOf } = useLocations();
  const countryName = countryFilter ? (countryOf(countryFilter)?.name ?? countryFilter) : '';

  const { categories, parents, selected, openParentId, siblings, isLeaf, facets } =
    useBrowseCategories(categoryId);

  usePageTitle(search ? `“${search}”` : selected ? selected.name : 'Browse listings');

  const { listings, total, totalPages, loading, refreshing, failed, retry, prefetchPage } =
    useBrowseListings(browseFilters, categories);
  const activeTokens = useBrowseTokens(browseFilters, selected, countryName);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const filters = (
    <>
      <details className="ws-filters__group" open>
        <summary className="ws-filters__legend">Category</summary>
        <select
          className="ws-select"
          value={openParentId}
          onChange={(e) => setParam({ categoryId: e.target.value })}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {siblings.length > 0 && (
          <ul className="ws-subcats">
            {siblings.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`ws-subcat${c.id === categoryId ? ' is-active' : ''}`}
                  onClick={() => setParam({ categoryId: c.id === categoryId ? openParentId : c.id })}
                  aria-pressed={c.id === categoryId}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="ws-filters__group" open>
        <summary className="ws-filters__legend">Location</summary>
        <div className="ws-stack" style={{ gap: 'var(--ws-space-2)' }}>
          <CountrySelect
            value={countryFilter}
            placeholder="Anywhere in the world"
            onChange={(e) => setParam({ country: e.target.value || null, state: null })}
            aria-label="Country"
          />
          {countryFilter && (
            <StateSelect
              country={countryFilter}
              value={stateFilter}
              placeholder={`All of ${countryName}`}
              onChange={(e) => setParam({ state: e.target.value || null })}
              aria-label="State or region"
            />
          )}
        </div>
      </details>

      <details className="ws-filters__group" open>
        <summary className="ws-filters__legend">Condition</summary>
        <select
          className="ws-select"
          value={condition}
          onChange={(e) => setParam({ condition: e.target.value })}
          aria-label="Condition"
        >
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
        </select>
      </details>

      <details className="ws-filters__group" open>
        <summary className="ws-filters__legend">Price (₦)</summary>
        <form
          className="ws-pricerange"
          onSubmit={(e) => { e.preventDefault(); applyPrice(); }}
        >
          <input
            className="ws-field ws-num"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min"
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
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
            onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
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
            value={attrFilters[attr.name] ?? ''}
            onChange={(e) => setParam({ [`attr.${attr.name}`]: e.target.value })}
            aria-label={attr.name}
          >
            <option value="">Any {attr.name.toLowerCase()}</option>
            {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </details>
      ))}

      {categoryId && !isLeaf && (
        <p className="ws-filters__hint">
          Pick a subcategory to filter by brand, size and other details.
        </p>
      )}
    </>
  );

  return (
    <div className="ws-wrap">
      <div className="ws-browse">
        <aside
          className={`ws-filters${filtersOpen ? ' is-open' : ''}`}
          id="browse-filters"
        >
          {filters}
        </aside>

        <div>
          <div className="ws-browse__head">
            <div>
              <h1 className="ws-h1">{selected ? selected.name : 'Marketplace'}</h1>
              <p className="ws-caption ws-muted ws-num" aria-live="polite">
                {loading || refreshing
                  ? 'Searching…'
                  : `${total.toLocaleString('en-NG')} ${total === 1 ? 'listing' : 'listings'}`}
                {!loading && !refreshing && (stateFilter || countryName) && ` in ${stateFilter || countryName}`}
              </p>
            </div>

            <div className="ws-browse__controls">

              <select
                className="ws-select ws-select--sm"
                value={sort}
                onChange={(e) => setParam({ sort: e.target.value || null })}
                aria-label="Sort listings"
              >
                <option value="">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>

              <button
                type="button"
                className="ws-btn ws-btn--sm ws-btn--secondary ws-browse__filtertoggle"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="browse-filters"
              >
                <SlidersHorizontal size={16} aria-hidden />
                Filters{activeTokens.length > 0 && ` (${activeTokens.length})`}
              </button>
            </div>
          </div>

          {activeTokens.length > 0 && (
            <div className="ws-activefilters">
              {activeTokens.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="ws-chip ws-chip--dismiss"
                  onClick={t.clear}
                  aria-label={`Remove filter ${t.label}`}
                >
                  {t.label}
                  <X size={14} aria-hidden />
                </button>
              ))}
              {activeTokens.length > 1 && (
                <button type="button" className="ws-chip" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="ws-grid" aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <ListingCardSkeleton key={i} showSeller />
              ))}
            </div>
          ) : failed ? (
            <div className="ws-empty" role="status">
              <span className="ws-empty__icon"><SearchX size={24} aria-hidden /></span>
              <h2 className="ws-title">Could not load listings</h2>
              <p className="ws-caption ws-muted" style={{ maxWidth: '34ch' }}>
                Check your connection and try again — your filters are still set.
              </p>
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                onClick={retry}
              >
                Try again
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="ws-empty">
              <span className="ws-empty__icon"><SearchX size={24} aria-hidden /></span>
              <h2 className="ws-title">
                {activeTokens.length > 0 ? 'No matches' : 'Nothing listed yet'}
              </h2>
              <p className="ws-caption ws-muted" style={{ maxWidth: '34ch' }}>
                {activeTokens.length > 0
                  ? 'Try removing a filter or searching a wider area.'
                  : 'Be the first to list something on the marketplace.'}
              </p>
              {activeTokens.length > 0 ? (
                <button className="ws-btn ws-btn--sm ws-btn--secondary" onClick={clearAll}>
                  Clear filters
                </button>
              ) : (
                                              <Link to="/vendor/register" className="ws-btn ws-btn--sm ws-btn--primary">
                  Open a store
                </Link>
              )}
            </div>
          ) : (
            <div className={`ws-grid${refreshing ? ' ws-busy' : ''}`} aria-busy={refreshing || undefined}>
              {listings.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <nav className="ws-pager" aria-label="Pagination">
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) }, { keepPage: true })}
                onMouseEnter={() => prefetchPage(page - 1)}
                onFocus={() => prefetchPage(page - 1)}
              >
                <ChevronLeft size={16} aria-hidden />
                Previous
              </button>
              <span className="ws-pager__status">Page {page} of {totalPages}</span>
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page >= totalPages}
                onClick={() => setParam({ page: String(page + 1) }, { keepPage: true })}
                onMouseEnter={() => page < totalPages && prefetchPage(page + 1)}
                onFocus={() => page < totalPages && prefetchPage(page + 1)}
              >
                Next
                <ChevronRight size={16} aria-hidden />
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
