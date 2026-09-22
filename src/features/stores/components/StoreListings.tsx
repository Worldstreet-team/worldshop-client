import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PackageSearch, Search, SearchX, X } from 'lucide-react';
import type { Listing } from '@/features/stores/api';
import type { StoreCategory } from '@/features/stores/hooks/useStorePage';
import ListingCard from '@/features/listings/components/ListingCard';
import ListingCardSkeleton from '@/features/listings/components/ListingCardSkeleton';
import Reveal from '@/shared/components/Reveal';

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

  const filtered = Boolean(search || categoryId);
  const category = categories.find((c) => c.id === categoryId);
  // A search box over three listings is clutter; it earns its place once
  // there is something to look through.
  const showTools = filtered || (catalogueTotal ?? 0) > 6 || categories.length > 1;

  return (
    <div>
      {showTools && (
        <div className="ws-storetools">
          <form
            className="ws-search ws-storetools__search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(draft.trim());
            }}
          >
            <Search size={18} aria-hidden />
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
                className="ws-storetools__clear"
                onClick={() => {
                  setDraft('');
                  onSearch('');
                }}
                aria-label="Clear search"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </form>

          {categories.length > 1 && (
            <div className="ws-catchips" role="group" aria-label="Categories in this store">
              <button
                type="button"
                className="ws-chip"
                aria-pressed={!categoryId}
                onClick={() => onCategory('')}
              >
                All
                {catalogueTotal != null && <span className="ws-chip__count ws-num">{catalogueTotal}</span>}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="ws-chip"
                  aria-pressed={c.id === categoryId}
                  onClick={() => onCategory(c.id === categoryId ? '' : c.id)}
                >
                  {c.name}
                  <span className="ws-chip__count ws-num">{c.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered && !loading && !failed && (
        <p className="ws-browse__count ws-storetools__count" aria-live="polite">
          <strong className="ws-num">{total.toLocaleString('en-NG')}</strong>{' '}
          {total === 1 ? 'listing' : 'listings'}
          {search && ` matching “${search}”`}
          {category && ` in ${category.name}`}
        </p>
      )}

      {loading ? (
        <div className="ws-grid" aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: 8 }, (_, i) => <ListingCardSkeleton key={i} />)}
        </div>
      ) : failed ? (
        <div className="ws-empty" role="status">
          <span className="ws-empty__icon"><SearchX size={24} aria-hidden /></span>
          <h3 className="ws-title">Could not load listings</h3>
          <p className="ws-caption ws-muted">Check your connection and try again.</p>
          <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : listings.length === 0 ? (
        filtered ? (
          <div className="ws-empty">
            <span className="ws-empty__icon"><SearchX size={24} aria-hidden /></span>
            <h3 className="ws-title">Nothing here matches</h3>
            <p className="ws-caption ws-muted">
              Try another word or category, or search the whole marketplace instead.
            </p>
            <div className="ws-contact__row" style={{ justifyContent: 'center' }}>
              <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onClear}>
                Show everything
              </button>
              {search && (
                <Link
                  to={`/listings?search=${encodeURIComponent(search)}`}
                  className="ws-btn ws-btn--sm ws-btn--primary"
                >
                  Search the marketplace
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="ws-empty">
            <span className="ws-empty__icon"><PackageSearch size={24} aria-hidden /></span>
            <h3 className="ws-title">No live listings right now</h3>
            <p className="ws-caption ws-muted">
              This seller has nothing published at the moment. Check back, or browse the marketplace.
            </p>
            <Link to="/listings" className="ws-btn ws-btn--sm ws-btn--secondary">
              Browse listings
            </Link>
          </div>
        )
      ) : (
        <div className={`ws-grid${refreshing ? ' ws-busy' : ''}`} aria-busy={refreshing || undefined}>
          {listings.map((l, i) => (
            <Reveal className="ws-reveal" index={i % 4} key={l.id}>
              <ListingCard listing={l} />
            </Reveal>
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
