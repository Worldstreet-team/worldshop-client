import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PackageOpen, Search, SearchX, X } from 'lucide-react';
import type { Listing } from '@/features/stores/api';
import type { StoreCategory } from '@/features/stores/hooks/useStorePage';
import { SORTS, sortRows } from '@/features/catalog/categoryFilters';
import ListingCard from '@/features/listings/components/ListingCard';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';

const SEARCH_DEBOUNCE_MS = 350;

type StoreListingsProps = {
  storeName: string;
  listings: Listing[];
  total: number;
  totalPages: number;
  catalogueTotal: number | null;
  categories: StoreCategory[];
  page: number;
  search: string;
  categoryId: string;
  loading: boolean;
  refreshing: boolean;
  failed: boolean;
  onRetry: () => void;
  onSearch: (q: string) => void;
  onCategory: (id: string) => void;
  onPage: (page: number) => void;
  onClear: () => void;
  prefetchPage: (page: number) => void;
};

/**
 * The shop's Listings tab, laid out as the sandbox's: a count and the sort on
 * one line, the shop's categories as pills, then the grid. The search box and
 * the pager are this app's, kept because a real shop can outgrow one screen.
 */
export default function StoreListings({
  storeName,
  listings,
  total,
  totalPages,
  catalogueTotal,
  categories,
  page,
  search,
  categoryId,
  loading,
  refreshing,
  failed,
  onRetry,
  onSearch,
  onCategory,
  onPage,
  onClear,
  prefetchPage,
}: StoreListingsProps) {
  const [draft, setDraft] = useState(search);
  const [seed, setSeed] = useState(search);
  const [sort, setSort] = useState('');
  if (seed !== search) {
    setSeed(search);
    setDraft(search);
  }

  useEffect(() => {
    const q = draft.trim();
    if (q === search) return;
    const t = window.setTimeout(() => onSearch(q), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [draft, search, onSearch]);

  // Sorts the page on hand; the API pages newest first.
  const shown = useMemo(() => sortRows(listings, sort), [listings, sort]);
  const filtered = Boolean(search || categoryId);
  const all = catalogueTotal ?? total;
  // A search box over three listings is clutter; it earns its place once
  // there is something to look through.
  const showSearch = filtered || all > 6;

  return (
    <div className="ws-shoplist">
      <div className="ws-shoplist__bar">
        <p className="ws-all__count ws-num" aria-live="polite">
          {loading
            ? 'Loading listings…'
            : `${total.toLocaleString('en-NG')} ${total === 1 ? 'listing' : 'listings'}${
                filtered ? ` of ${all.toLocaleString('en-NG')}` : ' for sale'
              }`}
        </p>

        <div className="ws-shoplist__tools">
          {showSearch && (
            <form
              className="ws-shoplist__search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                onSearch(draft.trim());
              }}
            >
              <Search size={16} aria-hidden />
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Search ${storeName}`}
                aria-label={`Search listings from ${storeName}`}
              />
              {draft && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('');
                    onSearch('');
                  }}
                  aria-label="Clear search"
                >
                  <X size={14} aria-hidden />
                </button>
              )}
            </form>
          )}

          {all > 1 && (
            <div className="ws-segmented" role="group" aria-label="Sort listings">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={sort === s.value}
                  className={`ws-segmented__btn${sort === s.value ? ' is-active' : ''}`}
                  onClick={() => setSort(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="ws-shoplist__cats" role="group" aria-label={`Categories in ${storeName}`}>
          {categories.map((c) => {
            const on = c.id === categoryId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                className={`ws-pill ws-cxpill ws-cxpill--lg${on ? ' is-on' : ''}`}
                onClick={() => onCategory(on ? '' : c.id)}
              >
                {c.name}
                {on && <X size={14} aria-hidden />}
              </button>
            );
          })}
          {categoryId && (
            <button type="button" className="ws-cxghost" onClick={() => onCategory('')}>
              Clear
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="ws-results ws-shop__grid" aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: 5 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : failed ? (
        <div className="ws-cxempty" role="status">
          <div className="ws-cxempty__inner">
            <span className="ws-cxempty__icon"><SearchX size={20} aria-hidden /></span>
            <p className="ws-cxempty__title">Could not load listings</p>
            <p className="ws-cxempty__body">Check your connection and try again.</p>
            <div className="ws-cxempty__action">
              <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onRetry}>
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div className="ws-cxempty">
          <div className="ws-cxempty__inner">
            <span className="ws-cxempty__icon">
              {filtered ? <SearchX size={20} aria-hidden /> : <PackageOpen size={20} aria-hidden />}
            </span>
            {filtered ? (
              <>
                <p className="ws-cxempty__title">
                  {search ? 'Nothing here matches' : 'Nothing in that category'}
                </p>
                <p className="ws-cxempty__body">
                  {storeName} has {all.toLocaleString('en-NG')} {all === 1 ? 'listing' : 'listings'} in all.
                  {search ? ' Try another word, or search the whole marketplace.' : ''}
                </p>
                <div className="ws-cxempty__action ws-shoplist__actions">
                  <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onClear}>
                    Show everything
                  </button>
                  {search && (
                    <Link
                      to={`/listings?search=${encodeURIComponent(search)}`}
                      className="ws-btn ws-btn--sm ws-btn--secondary"
                    >
                      Search the marketplace
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="ws-cxempty__title">No live listings right now</p>
                <p className="ws-cxempty__body">
                  This seller has nothing published at the moment. Check back, or browse the marketplace.
                </p>
                <div className="ws-cxempty__action">
                  <Link to="/categories" className="ws-btn ws-btn--sm ws-btn--secondary">
                    Browse categories
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`ws-results ws-shop__grid${refreshing ? ' ws-busy' : ''}`}
          aria-busy={refreshing || undefined}
          key={`${categoryId}-${sort}`}
        >
          {shown.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {totalPages > 1 && !loading && !failed && (
        <nav className="ws-pager" aria-label="Pagination">
          <button
            type="button"
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            onMouseEnter={() => prefetchPage(page - 1)}
            onFocus={() => prefetchPage(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden />
            Previous
          </button>
          <span className="ws-pager__status">Page {page} of {totalPages}</span>
          <button
            type="button"
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
            onMouseEnter={() => page < totalPages && prefetchPage(page + 1)}
            onFocus={() => page < totalPages && prefetchPage(page + 1)}
          >
            Next
            <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
