import { Link } from "react-router-dom";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import Pagination from "@/shared/components/common/Pagination";
import type { useBrowseListings } from "@/features/listings/hooks/useBrowseListings";
import type { useBrowseTokens } from "@/features/listings/hooks/useBrowseTokens";
import Reveal from "@/shared/components/Reveal";
import ListingCard from "@/features/listings/components/ListingCard";
import ListingCardSkeleton from "@/features/listings/components/ListingCardSkeleton";

type BrowseResultsProps = ReturnType<typeof useBrowseListings> & {
  tokens: ReturnType<typeof useBrowseTokens>;
  place: string;
  page: number;
  sort: string;
  filtersOpen: boolean;
  onSort: (sort: string | null) => void;
  onPage: (page: number) => void;
  onOpenFilters: () => void;
  onClearAll: () => void;
};

export default function BrowseResults({
  listings,
  totalPages,
  loading,
  switching,
  failed,
  retry,
  prefetchPage,
  tokens,
  page,
  sort,
  filtersOpen,
  onSort,
  onPage,
  onOpenFilters,
  onClearAll,
}: BrowseResultsProps) {
  const busy = loading || switching;

  return (
    <div className="ws-browse__results">
      <div className="ws-browse__toolbar">
        <div className="ws-browse__controls">
          <button
            type="button"
            className="ws-btn ws-btn--sm ws-btn--secondary ws-browse__filtertoggle"
            onClick={onOpenFilters}
            aria-expanded={filtersOpen}
            aria-controls="browse-filters"
          >
            <SlidersHorizontal size={16} aria-hidden />
            Filters
            {tokens.length > 0 && (
              <span className="ws-browse__badge ws-num">{tokens.length}</span>
            )}
          </button>

          <label className="ws-browse__sort">
            <span>Sort by</span>
            <select
              className="ws-select ws-select--sm"
              value={sort}
              onChange={(e) => onSort(e.target.value || null)}
              aria-label="Sort listings"
            >
              <option value="">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      {tokens.length > 0 && (
        <div className="ws-activefilters">
          {tokens.map((t) => (
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
          {tokens.length > 1 && (
            <button type="button" className="ws-chip" onClick={onClearAll}>
              Clear all
            </button>
          )}
        </div>
      )}

      {busy ? (
        <div className="ws-grid" aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: 8 }, (_, i) => (
            <ListingCardSkeleton key={i} showSeller />
          ))}
        </div>
      ) : failed ? (
        <div className="ws-empty" role="status">
          <span className="ws-empty__icon">
            <SearchX size={24} aria-hidden />
          </span>
          <h2 className="ws-title">Could not load listings</h2>
          <p className="ws-caption ws-muted">
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
          <span className="ws-empty__icon">
            <SearchX size={24} aria-hidden />
          </span>
          <h2 className="ws-title">
            {tokens.length > 0 ? "No matches" : "Nothing listed yet"}
          </h2>
          <p className="ws-caption ws-muted">
            {tokens.length > 0
              ? "Try removing a filter or searching a wider area."
              : "Be the first to list something on the marketplace."}
          </p>
          {tokens.length > 0 ? (
            <button
              className="ws-btn ws-btn--sm ws-btn--secondary"
              onClick={onClearAll}
            >
              Clear filters
            </button>
          ) : (
            <Link
              to="/vendor/register"
              className="ws-btn ws-btn--sm ws-btn--primary"
            >
              Open a store
            </Link>
          )}
        </div>
      ) : (
        <div className="ws-grid">
          {listings.map((l, i) => (
            <Reveal className="ws-reveal" index={i % 4} key={l.id}>
              <ListingCard listing={l} showSeller />
            </Reveal>
          ))}
        </div>
      )}

      {!busy && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPage}
          onPrefetch={prefetchPage}
        />
      )}
    </div>
  );
}
