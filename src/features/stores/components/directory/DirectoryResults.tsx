import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import type { DirectoryToken } from "@/shared/hooks/useDirectoryFilters";
import Reveal from "@/shared/components/Reveal";
import StoreCardSkeleton from "@/features/stores/components/StoreCardSkeleton";
import Pagination from "@/shared/components/common/Pagination";

type DirectoryResultsProps<T extends { id: string }> = {
  noun: [string, string];
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  loading: boolean;
  refreshing: boolean;
  failed: boolean;
  place: string;
  tokens: DirectoryToken[];
  renderItem: (item: T) => ReactNode;
  empty: { Icon: LucideIcon; title: string; copy: string; action: ReactNode };
  onRetry: () => void;
  onPage: (page: number) => void;
  onClearAll: () => void;
  onOpenFilters: () => void;
  filtersOpen: boolean;
};

export default function DirectoryResults<T extends { id: string }>({
  noun,
  items,
  totalPages,
  page,
  loading,
  refreshing,
  failed,
  place,
  tokens,
  renderItem,
  empty,
  onRetry,
  onPage,
  onClearAll,
  onOpenFilters,
  filtersOpen,
}: DirectoryResultsProps<T>) {
  const [many] = noun;
  const filtered = tokens.length > 0;

  return (
    <div>
      <div className="ws-browse__toolbar">
        <button
          type="button"
          className="ws-btn ws-btn--sm ws-btn--secondary ws-browse__filtertoggle"
          onClick={onOpenFilters}
          aria-expanded={filtersOpen}
          aria-controls="directory-filters"
        >
          <SlidersHorizontal size={16} aria-hidden />
          Filters
          {tokens.length > 0 && (
            <span className="ws-browse__badge ws-num">{tokens.length}</span>
          )}
        </button>

        {filtered && (
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
          </div>
        )}
      </div>

      {loading ? (
        <div
          className="ws-dirgrid"
          aria-busy="true"
          aria-label={`Loading ${many}`}
        >
          {Array.from({ length: 8 }, (_, i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </div>
      ) : failed ? (
        <div className="ws-empty" role="status">
          <span className="ws-empty__icon">
            <SearchX size={24} aria-hidden />
          </span>
          <h2 className="ws-title">Could not load {many}</h2>
          <p className="ws-caption ws-muted">
            Check your connection and try again
            {filtered ? " — your location is still set" : ""}.
          </p>
          <button
            type="button"
            className="ws-btn ws-btn--sm ws-btn--secondary"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="ws-empty">
          <span className="ws-empty__icon">
            <empty.Icon size={24} aria-hidden />
          </span>
          <h2 className="ws-title">
            {filtered ? `No ${many} in ${place} yet` : empty.title}
          </h2>
          <p className="ws-caption ws-muted">
            {filtered
              ? "Try a wider area, or clear the location to see everywhere."
              : empty.copy}
          </p>
          {filtered ? (
            <button
              type="button"
              className="ws-btn ws-btn--sm ws-btn--secondary"
              onClick={onClearAll}
            >
              Show all locations
            </button>
          ) : (
            empty.action
          )}
        </div>
      ) : (
        <div
          className={`ws-dirgrid${refreshing ? " ws-busy" : ""}`}
          aria-busy={refreshing || undefined}
        >
          {items.map((item, i) => (
            <Reveal className="ws-reveal" index={i % 4} key={item.id}>
              {renderItem(item)}
            </Reveal>
          ))}
        </div>
      )}

      {!loading && !failed && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPage}
        />
      )}
    </div>
  );
}
