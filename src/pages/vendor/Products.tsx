import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, EyeOff, Search, Package } from 'lucide-react';
import {
  listingService,
  storeService,
  type Listing,
  type ListingStatus,
  type ListingFilters,
} from '@/services/storeService';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';
import { firstImage } from '@/utils/listingFormat';
import { imageFallback, PRODUCT_PLACEHOLDER } from '@/utils/imageFallback';

/**
 * Manage Listings.
 *
 * Two independent gates decide whether a listing is actually on the
 * marketplace: the listing must be published, and the store must be paid up.
 * A vendor who has published everything and still sees nothing live needs to
 * be told which gate is closed — so the store's own state is shown here too,
 * not just per-listing status.
 */

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

/**
 * The publish endpoint reports every failed standard in one string, joined with
 * "; " behind a fixed prefix. Split back into individual problems so a rejection
 * reads as the same checklist the row already shows for a known-blocked draft,
 * rather than one long sentence. Single-gate errors (bad category, removed
 * listing) carry no prefix and pass through as a one-item list.
 */
const REQUIREMENTS_PREFIX = 'Listing does not meet the requirements: ';
const asProblems = (message: string): string[] =>
  message.startsWith(REQUIREMENTS_PREFIX)
    ? message.slice(REQUIREMENTS_PREFIX.length).split('; ').filter(Boolean)
    : [message];

const STATUS_TABS: Array<{ key: ListingStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'HIDDEN', label: 'Hidden' },
  { key: 'REMOVED', label: 'Removed' },
];

// The system has four badge tones; the four listing states map onto them 1:1.
const STATUS_STYLE: Record<ListingStatus, { cls: string; label: string }> = {
  PUBLISHED: { cls: 'ws-badge--success', label: 'Published' },
  DRAFT: { cls: 'ws-badge--neutral', label: 'Draft' },
  HIDDEN: { cls: 'ws-badge--warning', label: 'Hidden' },
  REMOVED: { cls: 'ws-badge--danger', label: 'Removed by admin' },
};

function priceLabel(l: Listing): string {
  if (l.priceType === 'ON_REQUEST') return 'Contact for price';
  const fmt = (n: number) => '₦' + n.toLocaleString('en-NG');
  if (l.priceType === 'RANGE' && l.basePrice != null && l.maxPrice != null) {
    return `${fmt(l.basePrice)} – ${fmt(l.maxPrice)}`;
  }
  return l.basePrice != null ? fmt(l.basePrice) : '—';
}

export default function VendorListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  /**
   * Why a publish attempt was rejected, per listing. Kept in state rather than
   * left to the toast: the toast auto-dismisses, and the vendor needs the
   * checklist to stay on screen while they go and fix it.
   */
  const [publishErrors, setPublishErrors] = useState<Record<string, string[]>>({});
  const [storeLive, setStoreLive] = useState<boolean | null>(null);
  const [tab, setTab] = useState<ListingStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ListingFilters = {
        page,
        limit: 15,
        ...(tab !== 'ALL' ? { status: tab } : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
      };
      const res = await listingService.list(filters);
      setListings(res.data);
      // Pinned rejections describe the rows we are replacing, and the refetched
      // compliance annotation supersedes them. Keeping them would show a vendor
      // a stale reason for a problem they may have just fixed.
      setPublishErrors({});
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to load listings') });
    } finally {
      setLoading(false);
    }
  }, [page, tab, appliedSearch, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Whether publishing will actually make anything visible depends on the
  // subscription, so the answer is fetched once and shown up front.
  useEffect(() => {
    let cancelled = false;
    storeService
      .getMyStore()
      .then((res) => {
        if (!cancelled) setStoreLive(res.data.isPubliclyVisible);
      })
      .catch(() => {
        if (!cancelled) setStoreLive(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Publishing runs the category's listing standards server-side. A rejection
   * is a checklist of what is missing, so it is surfaced verbatim rather than
   * flattened into "could not publish".
   */
  const handlePublish = async (listing: Listing) => {
    setBusyId(listing.id);
    try {
      const res = await listingService.publish(listing.id);
      setPublishErrors((prev) => {
        if (!prev[listing.id]) return prev;
        const next = { ...prev };
        delete next[listing.id];
        return next;
      });
      addToast({ type: 'success', message: res.data.message });
      await load();
    } catch (err: unknown) {
      const message = errMessage(err, 'Could not publish this listing');
      // Pinned to the row as well as toasted, so it survives the toast timeout.
      setPublishErrors((prev) => ({ ...prev, [listing.id]: asProblems(message) }));
      addToast({ type: 'error', message });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnpublish = async (listing: Listing) => {
    setBusyId(listing.id);
    try {
      await listingService.unpublish(listing.id);
      addToast({ type: 'success', message: 'Listing hidden from buyers' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not hide this listing') });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (listing: Listing) => {
    if (!window.confirm(`Delete "${listing.name}"? This cannot be undone.`)) return;
    setBusyId(listing.id);
    try {
      await listingService.remove(listing.id);
      addToast({ type: 'success', message: 'Listing deleted' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Could not delete this listing') });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <h1 className="ws-page__title">Manage Listings</h1>
        <Link to="/vendor/products/new" className="ws-btn ws-btn--sm ws-btn--primary">
          <Plus size={14} aria-hidden />
          Add Listing
        </Link>
      </div>

      {/* The second gate. Without this, a vendor who published everything and
          sees nothing on the marketplace has no way to know why. */}
      {storeLive === false && (
        <div className="ws-alert ws-alert--warning" style={{ marginBottom: 'var(--ws-space-4)' }}>
          <EyeOff size={16} aria-hidden />
          <span style={{ flex: 1 }}>
            Your store is not visible to buyers yet, so published listings stay private.
          </span>
          <Link to="/vendor" style={{ color: 'inherit', fontWeight: 600 }}>Activate</Link>
        </div>
      )}

      <div
        style={{
          display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap',
          alignItems: 'center', marginBottom: 'var(--ws-space-4)',
        }}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`ws-chip${tab === t.key ? ' is-active' : ''}`}
            aria-pressed={tab === t.key}
          >
            {t.label}
          </button>
        ))}

        <form
          onSubmit={(e) => { e.preventDefault(); setAppliedSearch(search); setPage(1); }}
          style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--ws-space-2)' }}
          role="search"
        >
          <div className="ws-search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              placeholder="Search listings"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search listings"
            />
          </div>
          <button type="submit" className="ws-btn ws-btn--sm ws-btn--secondary">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="ws-stack">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ws-skeleton" style={{ height: 56 }} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon">
            <Package size={26} aria-hidden />
          </div>
          <p className="ws-body ws-muted" style={{ maxWidth: '44ch' }}>
            {appliedSearch || tab !== 'ALL'
              ? 'No listings match this filter.'
              : 'You have no listings yet. Add your first product so buyers can find you.'}
          </p>
          {!appliedSearch && tab === 'ALL' && (
            <Link to="/vendor/products/new" className="ws-btn ws-btn--sm ws-btn--primary">
              <Plus size={14} aria-hidden />
              Add Listing
            </Link>
          )}
        </div>
      ) : (
        <div className="ws-card ws-card--flush ws-table-wrap">
          <table className="ws-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                {/* The numbers that justify the subscription. */}
                <th className="ws-table__num">Views</th>
                <th className="ws-table__num">Inquiries</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const style = STATUS_STYLE[l.status];
                const busy = busyId === l.id;
                // A real rejection wins over the precomputed annotation: it is
                // both fresher and authoritative, and it covers gates the
                // annotation does not model.
                const rejected = publishErrors[l.id];
                // Absent on older server builds — treat unknown as publishable
                // and let the endpoint be the authority, rather than blocking
                // a vendor on missing data.
                const blockers = rejected ?? (l.compliance?.compliant === false ? l.compliance.problems : []);
                const thumb = firstImage(l);

                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--ws-space-3)', alignItems: 'flex-start' }}>
                        {/* Fixed square so rows keep a common height whether or
                            not a listing has a photo yet. */}
                        {thumb ? (
                          <img
                            src={thumb}
                            alt=""
                            onError={imageFallback(PRODUCT_PLACEHOLDER)}
                            style={{
                              width: 40, height: 40, flex: '0 0 40px', objectFit: 'cover',
                              borderRadius: 'var(--ws-radius-sm)', border: '1px solid var(--ws-border-hairline)',
                            }}
                          />
                        ) : (
                          <div
                            aria-hidden
                            title="No photo"
                            style={{
                              width: 40, height: 40, flex: '0 0 40px',
                              borderRadius: 'var(--ws-radius-sm)',
                              border: '1px dashed var(--ws-border-hairline)',
                              background: 'var(--ws-bg-sunken)',
                            }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <Link to={`/vendor/products/${l.id}`} style={{ fontWeight: 600, color: 'var(--ws-text-primary)', textDecoration: 'none' }}>
                            {l.name}
                          </Link>
                          {l.city || l.state ? (
                            <div className="ws-caption ws-muted">
                              {[l.city, l.state].filter(Boolean).join(', ')}
                            </div>
                          ) : null}
                          {/* Why this listing cannot go live, stated before the
                              vendor clicks Publish. Suppressed once published —
                              at that point it is already on the marketplace and
                              the checklist would only be noise. */}
                          {blockers.length > 0 && l.status !== 'PUBLISHED' && (
                            <div
                              className="ws-caption"
                              style={{ marginTop: 'var(--ws-space-1)', color: 'var(--ws-status-danger)' }}
                            >
                              {/* Named only after a real attempt, so the vendor
                                  can tell "your click just failed, here is why"
                                  from a blocker we already knew about. */}
                              {rejected && <strong>Publish failed:</strong>}
                              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                                {blockers.map((problem) => <li key={problem}>{problem}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {l.category?.name ?? (
                        <span style={{ color: 'var(--ws-status-danger)' }}>Not set</span>
                      )}
                    </td>
                    <td className="ws-num">{priceLabel(l)}</td>
                    <td>
                      <span className={`ws-badge ${style.cls}`}>{style.label}</span>
                    </td>
                    <td className="ws-table__num">{l.viewCount}</td>
                    <td className="ws-table__num">{l.inquiryCount}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {l.status === 'REMOVED' ? (
                        <span className="ws-caption ws-muted">Contact support</span>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: 'var(--ws-space-2)' }}>
                          {l.status === 'PUBLISHED' ? (
                            <button className="ws-btn ws-btn--sm ws-btn--secondary" disabled={busy} onClick={() => handleUnpublish(l)}>
                              {busy ? '…' : 'Hide'}
                            </button>
                          ) : (
                            <button
                              className="ws-btn ws-btn--sm ws-btn--primary"
                              disabled={busy || blockers.length > 0}
                              title={blockers.length > 0 ? `Fix first: ${blockers.join('; ')}` : undefined}
                              onClick={() => handlePublish(l)}
                            >
                              {busy ? '…' : 'Publish'}
                            </button>
                          )}
                          <Link to={`/vendor/products/${l.id}`} className="ws-btn ws-btn--sm ws-btn--secondary">
                            Edit
                          </Link>
                          <button
                            className="ws-btn ws-btn--sm ws-btn--danger"
                            disabled={busy}
                            onClick={() => handleDelete(l)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="ws-pager">
          <button
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="ws-pager__status ws-num">
            Page {page} of {totalPages} · {total} listing{total === 1 ? '' : 's'}
          </span>
          <button
            className="ws-btn ws-btn--sm ws-btn--secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
