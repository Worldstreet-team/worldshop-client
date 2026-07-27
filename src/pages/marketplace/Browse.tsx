import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { publicMarketplace, type Listing, type PublicStore } from '@/services/storeService';
import { categoryService } from '@/services/productService';
import type { Category, CategoryAttribute } from '@/types/product.types';
import ListingCard from '@/components/marketplace/ListingCard';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';

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
  const [loading, setLoading] = useState(true);
  const [searchBox, setSearchBox] = useState(params.get('search') ?? '');

  const categoryId = params.get('categoryId') ?? '';
  const stateFilter = params.get('state') ?? '';
  const condition = params.get('condition') ?? '';
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // Selected attribute values, read straight back out of the URL.
  const attrFilters = useMemo(() => {
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith('attr.')) out[key.slice(5)] = value;
    });
    return out;
  }, [params]);

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

  useEffect(() => {
    let cancelled = false;

    const query: Record<string, unknown> = { page, limit: PER_PAGE };
    if (categoryId) query.categoryId = categoryId;
    if (stateFilter) query.state = stateFilter;
    if (condition) query.condition = condition;
    if (search) query.search = search;
    for (const [name, value] of Object.entries(attrFilters)) query[`attr.${name}`] = value;

    publicMarketplace
      .browse(query)
      .then((res) => {
        if (cancelled) return;
        setListings(res.data);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, categoryId, stateFilter, condition, search, attrFilters]);

  const activeFilterCount =
    (categoryId ? 1 : 0) + (stateFilter ? 1 : 0) + (condition ? 1 : 0) + Object.keys(attrFilters).length;

  const clearAll = () => setParams(search ? new URLSearchParams({ search }) : new URLSearchParams());

  return (
    // Vertical padding only — the shorthand would zero out the side gutters
    // `.container` provides, putting content flush against the viewport edge.
    <div className="container browse-page" style={{ paddingBlock: '1.5rem' }}>
      <h1 style={{ marginBottom: '0.75rem' }}>Marketplace</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); setParam({ search: searchBox }); }}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
      >
        <input
          type="search"
          value={searchBox}
          onChange={(e) => setSearchBox(e.target.value)}
          placeholder="What are you looking for?"
          style={{ flex: 1, padding: '0.6rem 0.85rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
        />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {/* Sidebar + results collapse to a single column on mobile; see
          `.browse-page__layout` in _pages.scss. */}
      <div className="browse-page__layout">
        {/* ── Filters ── */}
        <aside className="browse-page__filters">
          {activeFilterCount > 0 && (
            <button className="btn-secondary" onClick={clearAll}>
              Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
            </button>
          )}

          <div>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#667085', marginBottom: '0.5rem' }}>
              Category
            </h3>
            <select
              value={openParentId}
              onChange={(e) => setParam({ categoryId: e.target.value })}
              style={{ width: '100%', padding: '0.45rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
            >
              <option value="">All categories</option>
              {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Subcategories are links rather than a second dropdown: they are
                the level that unlocks facets, so they should be one click. */}
            {siblings.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '0.5rem 0 0', padding: 0, display: 'grid', gap: 2 }}>
                {siblings.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setParam({ categoryId: c.id })}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0',
                        color: c.id === categoryId ? '#101828' : '#475467',
                        fontWeight: c.id === categoryId ? 700 : 400,
                        fontSize: '0.88rem', textAlign: 'left',
                      }}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#667085', marginBottom: '0.5rem' }}>
              Location
            </h3>
            <select
              value={stateFilter}
              onChange={(e) => setParam({ state: e.target.value })}
              style={{ width: '100%', padding: '0.45rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
            >
              <option value="">Anywhere in Nigeria</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#667085', marginBottom: '0.5rem' }}>
              Condition
            </h3>
            <select
              value={condition}
              onChange={(e) => setParam({ condition: e.target.value })}
              style={{ width: '100%', padding: '0.45rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
            >
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Only meaningful once narrowed to a subcategory. */}
          {facets.map((attr) => (
            <div key={attr.name}>
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#667085', marginBottom: '0.5rem' }}>
                {attr.name}
              </h3>
              <select
                value={attrFilters[attr.name] ?? ''}
                onChange={(e) => setParam({ [`attr.${attr.name}`]: e.target.value })}
                style={{ width: '100%', padding: '0.45rem', border: '1px solid #e4e7ec', borderRadius: 6 }}
              >
                <option value="">Any {attr.name.toLowerCase()}</option>
                {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

          {categoryId && !isLeaf && (
            <p style={{ fontSize: '0.8rem', color: '#98a2b3', lineHeight: 1.4 }}>
              Pick a subcategory to filter by size, brand and other details.
            </p>
          )}
        </aside>

        {/* ── Results ── */}
        <div>
          <div style={{ color: '#667085', marginBottom: '0.75rem' }}>
            {loading ? 'Searching…' : `${total} listing${total === 1 ? '' : 's'}`}
            {selected && <> in <strong>{selected.name}</strong></>}
            {stateFilter && <> · {stateFilter}</>}
          </div>

          {!loading && listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#667085' }}>
              <span className="material-icons" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>
                search_off
              </span>
              <p style={{ marginBottom: '0.75rem' }}>
                {activeFilterCount > 0
                  ? 'Nothing matches these filters yet.'
                  : 'No listings on the marketplace yet.'}
              </p>
              {activeFilterCount > 0 ? (
                <button className="btn-secondary" onClick={clearAll}>Clear filters</button>
              ) : (
                // The empty marketplace is a supply problem, so the call to
                // action is to become a seller.
                <Link to="/vendor/register" className="btn-primary">Open a store</Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {listings.map((l) => <ListingCard key={l.id} listing={l} showSeller />)}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1.5rem' }}>
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) }, { keepPage: true })}
              >
                Previous
              </button>
              <span style={{ color: '#667085' }}>Page {page} of {totalPages}</span>
              <button
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setParam({ page: String(page + 1) }, { keepPage: true })}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
