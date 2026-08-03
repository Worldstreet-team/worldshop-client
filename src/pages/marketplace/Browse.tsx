import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SearchX, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { publicMarketplace, type Listing, type PublicStore } from '@/services/storeService';
import { categoryService } from '@/services/productService';
import type { Category, CategoryAttribute } from '@/types/product.types';
import ListingCard from '@/components/marketplace/ListingCard';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Marketplace browse.
 *
 * All filter state lives in the URL. That is not a nicety here: a buyer filters
 * down to "Phones in Lagos, 128GB, Used", and that result set needs to survive
 * being shared, bookmarked, or reached by the back button after opening a
 * listing.
 *
 * Attribute facets only appear once a *subcategory* is chosen, because
 * attributes are defined per category — there is no meaningful "Storage" filter
 * across the whole marketplace. Only SELECT attributes marked filterable are
 * offered; free-text ones have no shared vocabulary to filter on.
 */

const CONDITIONS = ['NEW', 'USED', 'REFURBISHED'] as const;
const PER_PAGE = 24;

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function Browse() {
  const [params, setParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [facetSource, setFacetSource] = useState<{ categoryId: string; attributes: CategoryAttribute[] }>({
    categoryId: '',
    attributes: [],
  });
  const [listings, setListings] = useState<Array<Listing & { store: PublicStore }>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoryId = params.get('categoryId') ?? '';
  const stateFilter = params.get('state') ?? '';
  const condition = params.get('condition') ?? '';
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = params.get('sort') ?? '';
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';

  // Selected attribute values, read straight back out of the URL.
  const attrFilters = useMemo(() => {
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith('attr.')) out[key.slice(5)] = value;
    });
    return out;
  }, [params]);

  // Price inputs are drafts committed on blur/Enter, not per keystroke — a
  // half-typed "1" would otherwise refetch as ₦1. When the URL changes from
  // elsewhere (pill ×, back button) the drafts re-seed during render rather
  // than in an effect, so there is no flash of stale input.
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice });
  const [priceSeed, setPriceSeed] = useState({ min: minPrice, max: maxPrice });
  if (priceSeed.min !== minPrice || priceSeed.max !== maxPrice) {
    setPriceSeed({ min: minPrice, max: maxPrice });
    setPriceDraft({ min: minPrice, max: maxPrice });
  }

  const parents = useMemo(() => {
    const withChildren = new Set(categories.map((c) => c.parentId).filter(Boolean));
    return categories.filter((c) => !c.parentId && withChildren.has(c.id));
  }, [categories]);

  const selected = categories.find((c) => c.id === categoryId);
  // The parent to show children for: the selection itself if it is a parent,
  // otherwise the selection's parent so its siblings stay visible.
  const openParentId = selected ? (selected.parentId ?? selected.id) : '';
  const siblings = useMemo(
    () => categories.filter((c) => c.parentId === openParentId),
    [categories, openParentId],
  );
  const isLeaf = Boolean(selected?.parentId);

  usePageTitle(search ? `“${search}”` : selected ? selected.name : 'Browse listings');

  /**
   * Writes filter changes back to the URL. Any change except paging resets to
   * page 1 — leaving someone on page 7 of a narrower result set shows them an
   * empty page and looks broken.
   */
  const setParam = useCallback(
    (updates: Record<string, string | null>, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      if (!opts.keepPage) next.delete('page');
      setParams(next);
    },
    [params, setParams],
  );

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => undefined);
  }, []);

  // Facets are per-category. They are keyed by the category they were fetched
  // for, so a stale set is never shown while a new fetch is in flight.
  const facets = facetSource.categoryId === categoryId ? facetSource.attributes : [];

  useEffect(() => {
    if (!categoryId || !isLeaf) return;
    let cancelled = false;

    categoryService
      .getCategoryAttributes(categoryId)
      .then((attrs) => {
        if (cancelled) return;
        setFacetSource({
          categoryId,
          attributes: attrs.filter((a) => a.isFilterable && a.type === 'SELECT'),
        });
      })
      .catch(() => {
        if (!cancelled) setFacetSource({ categoryId, attributes: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, isLeaf]);

  // Loading is derived: the grid is loading whenever the last-completed fetch
  // key lags the requested one — no setState-in-effect needed to reset it.
  const fetchKey = [
    page, categoryId, stateFilter, condition, search, sort, minPrice, maxPrice,
    JSON.stringify(attrFilters), retryTick,
  ].join('|');
  const loading = loadedKey !== fetchKey;

  useEffect(() => {
    let cancelled = false;

    const query: Record<string, unknown> = { page, limit: PER_PAGE };
    if (categoryId) query.categoryId = categoryId;
    if (stateFilter) query.state = stateFilter;
    if (condition) query.condition = condition;
    if (search) query.search = search;
    if (sort) query.sort = sort;
    if (minPrice) query.minPrice = minPrice;
    if (maxPrice) query.maxPrice = maxPrice;
    for (const [name, value] of Object.entries(attrFilters)) query[`attr.${name}`] = value;

    publicMarketplace
      .browse(query)
      .then((res) => {
        if (cancelled) return;
        setListings(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        setFailed(false);
      })
      // A failed fetch is not an empty marketplace — without this flag the
      // empty state would tell a user with a dropped connection that nothing
      // is listed and invite them to open a store.
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(fetchKey);
      });

    return () => {
      cancelled = true;
    };
  }, [page, categoryId, stateFilter, condition, search, sort, minPrice, maxPrice, attrFilters, retryTick, fetchKey]);

  /**
   * Every applied filter as a removable token. Showing them above the results
   * is what makes a narrowed result set legible — a buyer who sees 3 items
   * needs to know which of five filters caused that.
   */
  const activeTokens = useMemo(() => {
    const out: Array<{ key: string; label: string; clear: () => void }> = [];
    if (search) out.push({ key: 'search', label: `“${search}”`, clear: () => setParam({ search: null }) });
    if (selected) out.push({ key: 'cat', label: selected.name, clear: () => setParam({ categoryId: null }) });
    if (stateFilter) out.push({ key: 'state', label: stateFilter, clear: () => setParam({ state: null }) });
    if (condition) out.push({ key: 'cond', label: titleCase(condition), clear: () => setParam({ condition: null }) });
    if (minPrice || maxPrice) {
      const fmt = (v: string) => `₦${Number(v).toLocaleString('en-NG')}`;
      const label =
        minPrice && maxPrice ? `${fmt(minPrice)} – ${fmt(maxPrice)}`
        : minPrice ? `From ${fmt(minPrice)}`
        : `Under ${fmt(maxPrice)}`;
      out.push({ key: 'price', label, clear: () => setParam({ minPrice: null, maxPrice: null }) });
    }
    for (const [name, value] of Object.entries(attrFilters)) {
      out.push({ key: `attr.${name}`, label: `${name}: ${value}`, clear: () => setParam({ [`attr.${name}`]: null }) });
    }
    return out;
  }, [search, selected, stateFilter, condition, minPrice, maxPrice, attrFilters, setParam]);

  const clearAll = () => setParams(new URLSearchParams());

  const applyPrice = () => {
    setParam({ minPrice: priceDraft.min.trim() || null, maxPrice: priceDraft.max.trim() || null });
  };

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

        {/* Subcategories are links rather than a second dropdown: they are the
            level that unlocks facets, so they should be one click. */}
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
        <select
          className="ws-select"
          value={stateFilter}
          onChange={(e) => setParam({ state: e.target.value })}
          aria-label="Location"
        >
          <option value="">Anywhere in Nigeria</option>
          {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
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
          {/* Hidden submit so Enter applies the range. */}
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      </details>

      {/* Only meaningful once narrowed to a subcategory. */}
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
                {loading
                  ? 'Searching…'
                  : `${total.toLocaleString('en-NG')} ${total === 1 ? 'listing' : 'listings'}`}
                {stateFilter && !loading && ` in ${stateFilter}`}
              </p>
            </div>

            <div className="ws-browse__controls">
              {/* Sort gets no active-filter pill: it narrows nothing, it only
                  reorders. */}
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
            // Skeletons match the card's real proportions so the grid does not
            // reflow when results land.
            <div className="ws-grid" aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <div className="ws-pcard" key={i}>
                  <div className="ws-skeleton ws-pcard__media" />
                  <div className="ws-pcard__body">
                    <div className="ws-skeleton" style={{ height: 14, width: '90%' }} />
                    <div className="ws-skeleton" style={{ height: 14, width: '55%' }} />
                    <div className="ws-skeleton" style={{ height: 11, width: '40%', marginTop: 4 }} />
                  </div>
                </div>
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
                onClick={() => setRetryTick((t) => t + 1)}
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
                // An empty marketplace is a supply problem, so the call to
                // action is to become a seller.
                <Link to="/vendor/register" className="ws-btn ws-btn--sm ws-btn--primary">
                  Open a store
                </Link>
              )}
            </div>
          ) : (
            <div className="ws-grid">
              {listings.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <nav className="ws-pager" aria-label="Pagination">
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) }, { keepPage: true })}
              >
                <ChevronLeft size={16} aria-hidden />
                Previous
              </button>
              <span className="ws-pager__status">Page {page} of {totalPages}</span>
              <button
                className="ws-btn ws-btn--sm ws-btn--secondary"
                disabled={page >= totalPages}
                onClick={() => setParam({ page: String(page + 1) }, { keepPage: true })}
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
