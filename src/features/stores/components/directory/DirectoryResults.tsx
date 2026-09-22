import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, SearchX, X } from 'lucide-react';
import type { DirectoryToken } from '@/shared/hooks/useDirectoryFilters';
import Reveal from '@/shared/components/Reveal';
import StoreCardSkeleton from '@/features/stores/components/StoreCardSkeleton';

type DirectoryResultsProps<T extends { id: string }> = {
  /** Singular and plural, for the count line. */
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
  /** What an unfiltered, empty directory says — an invitation, not an apology. */
  empty: { Icon: LucideIcon; title: string; copy: string; action: ReactNode };
  onRetry: () => void;
  onPage: (page: number) => void;
  onClearAll: () => void;
};

export default function DirectoryResults<T extends { id: string }>({
  noun,
  items,
  total,
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
}: DirectoryResultsProps<T>) {
  const [one, many] = noun;
  const filtered = tokens.length > 0;

  return (
    <div>
      <div className="ws-browse__toolbar">
        <p className="ws-browse__count" aria-live="polite">
          {loading ? (
            'Loading…'
          ) : failed ? (
            'Could not load'
          ) : (
            <>
              <strong className="ws-num">{total.toLocaleString('en-NG')}</strong>{' '}
              {total === 1 ? one : many}
              {place && ` in ${place}`}
            </>
          )}
        </p>

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
        <div className="ws-dirgrid" aria-busy="true" aria-label={`Loading ${many}`}>
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
            Check your connection and try again{filtered ? ' — your location is still set' : ''}.
          </p>
          <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="ws-empty">
          <span className="ws-empty__icon">
            <empty.Icon size={24} aria-hidden />
          </span>
          <h2 className="ws-title">{filtered ? `No ${many} in ${place} yet` : empty.title}</h2>
          <p className="ws-caption ws-muted">
            {filtered ? 'Try a wider area, or clear the location to see everywhere.' : empty.copy}
          </p>
          {filtered ? (
            <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={onClearAll}>
              Show all locations
            </button>
          ) : (
            empty.action
          )}
        </div>
      ) : (
        <div
          className={`ws-dirgrid${refreshing ? ' ws-busy' : ''}`}
          aria-busy={refreshing || undefined}
        >
          {items.map((item, i) => (
            <Reveal className="ws-reveal" index={i % 4} key={item.id}>
              {renderItem(item)}
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
          >
            <ChevronLeft size={16} aria-hidden />
            Previous
          </button>
          <span className="ws-pager__status">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
          >
            Next
            <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
