import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download, EyeOff,
  Package, Plus, Search, X,
} from 'lucide-react';
import { type Listing, type ListingStatus as Status, type ListingFilters } from '@/features/stores/api';
import { useListingApi } from '@/features/stores/context/ListingApiContext';
import { ListingStatus, VendorPage, VendorPageHead } from '@/features/stores/components/vendor/VendorPage';
import { RowMenu, type RowMenuItem } from '@/shared/components/common';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';
import { firstImage, fmtNaira, postedAgo } from '@/features/listings/model';
import { imageFallback, PRODUCT_PLACEHOLDER } from '@/shared/utils/imageFallback';
import { formatLocation } from '@/shared/utils/locations';

/**
 * Manage Listings, laid out as the sandbox's vendor Listings: a toolbar of
 * search and status, a selectable table, a pager with page sizes.
 *
 * Two independent gates decide whether a listing is actually on the
 * marketplace: the listing must be published, and the store must be paid up.
 * A vendor who has published everything and still sees nothing live needs to
 * be told which gate is closed, so the store's own state is shown here too,
 * not just per-listing status.
 *
 * The sandbox's Sales column is Inquiries here, and its Sold and Archived
 * statuses are Hidden and Removed: nothing is sold on the platform.
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

const STATUS_TABS: Array<{ key: Status | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'PUBLISHED', label: 'Active' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'HIDDEN', label: 'Hidden' },
  { key: 'REMOVED', label: 'Removed' },
];

const PAGE_SIZES = [10, 25, 50];

// The vendor table shows a dash for an unpriced fixed listing: the
// buyer-facing "Contact for price" would read oddly in the seller's own
// console. ₦ formatting still comes from the shared util so it cannot drift.
function priceLabel(l: Listing): string {
  if (l.priceType === 'ON_REQUEST') return 'On request';
  if (l.priceType === 'RANGE' && l.basePrice != null && l.maxPrice != null) {
    return `${fmtNaira(l.basePrice)} – ${fmtNaira(l.maxPrice)}`;
  }
  return l.basePrice != null ? fmtNaira(l.basePrice) : '—';
}

type SortKey = 'name' | 'status' | 'price' | 'views' | 'inquiries' | 'posted';
const SORT_VALUE: Record<SortKey, (l: Listing) => number | string> = {
  name: (l) => l.name.toLowerCase(),
  status: (l) => l.status,
  price: (l) => l.basePrice ?? -1,
  views: (l) => l.viewCount,
  inquiries: (l) => l.inquiryCount,
  posted: (l) => Date.parse(l.publishedAt ?? l.updatedAt) || 0,
};

/** Page numbers with gaps, at most seven slots: 1 … 4 5 6 … 12. */
function pageList(page: number, count: number): Array<number | 'gap'> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: Array<number | 'gap'> = [1];
  const from = Math.max(2, Math.min(page - 1, count - 4));
  const to = Math.min(count - 1, Math.max(page + 1, 5));
  if (from > 2) out.push('gap');
  for (let p = from; p <= to; p++) out.push(p);
  if (to < count - 1) out.push('gap');
  out.push(count);
  return out;
}

function csvOf(rows: Listing[]): string {
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Listing', 'Status', 'Price', 'Views', 'Inquiries', 'Category', 'Location'];
  const body = rows.map((l) =>
    [l.name, l.status, priceLabel(l), l.viewCount, l.inquiryCount, l.category?.name, formatLocation([l.city, l.state], l.country)]
      .map(cell)
      .join(','),
  );
  return [head.map(cell).join(','), ...body].join('\n');
}

export default function VendorListings() {
  // Which catalogue this page manages: the personal store's by default, or a
  // mall substore's when rendered inside a SubstoreListingApiProvider.
  const { api: listingService, productsBasePath, dashboardPath, parent, getVisibility } = useListingApi();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  // A Set, not a single id: otherwise starting an action on one row while
  // another row's action is still in flight would re-enable that row's
  // buttons early, letting a second click race the first.
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  /**
   * Why a publish attempt was rejected, per listing. Kept in state rather than
   * left to the toast: the toast auto-dismisses, and the vendor needs the
   * checklist to stay on screen while they go and fix it.
   */
  const [publishErrors, setPublishErrors] = useState<Record<string, string[]>>({});
  const [storeLive, setStoreLive] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Status | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // The top bar's search lands here as ?q=.
  const [search, setSearch] = useState(() => params.get('q') ?? '');
  const [appliedSearch, setAppliedSearch] = useState(() => params.get('q') ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  // A new ?q= from the top bar while already on this page.
  const urlQ = params.get('q') ?? '';
  const [seenQ, setSeenQ] = useState(urlQ);
  if (seenQ !== urlQ) {
    setSeenQ(urlQ);
    setSearch(urlQ);
    setAppliedSearch(urlQ);
    setPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ListingFilters = {
        page,
        limit: pageSize,
        ...(tab !== 'ALL' ? { status: tab } : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
      };
      const res = await listingService.list(filters);
      setListings(res.data);
      // Pinned rejections describe the rows we are replacing, and the refetched
      // compliance annotation supersedes them. Keeping them would show a vendor
      // a stale reason for a problem they may have just fixed.
      setPublishErrors({});
      setSelected(new Set());
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      addToast({ type: 'error', message: errMessage(err, 'Failed to load listings') });
    } finally {
      setLoading(false);
    }
    // listingService comes from context: navigating between two substores
    // swaps it WITHOUT remounting this component, so omitting it here would
    // keep serving the previous substore's catalogue.
  }, [page, pageSize, tab, appliedSearch, addToast, listingService]);

  useEffect(() => {
    load();
  }, [load]);

  // One count per status for the segmented control. The list endpoint is the
  // only source that works for a substore too, so each is a one-row read.
  const counts = useQuery({
    queryKey: ['vendor', 'listing-counts', productsBasePath, total],
    queryFn: async () => {
      const entries = await Promise.all(
        STATUS_TABS.map(async (t) => {
          const res = await listingService.list({ page: 1, limit: 1, ...(t.key !== 'ALL' ? { status: t.key } : {}) });
          return [t.key, res.pagination.total] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<Status | 'ALL', number>;
    },
    staleTime: 30_000,
  });

  // Whether publishing will actually make anything visible depends on the
  // subscription, so the answer is fetched once and shown up front.
  useEffect(() => {
    let cancelled = false;
    getVisibility()
      .then((visible) => {
        if (!cancelled) setStoreLive(visible);
      })
      .catch(() => {
        if (!cancelled) setStoreLive(null);
      });
    return () => {
      cancelled = true;
    };
  }, [getVisibility]);

  const markBusy = (id: string) => setBusyIds((prev) => new Set(prev).add(id));
  const clearBusy = (id: string) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  /**
   * Publishing runs the category's listing standards server-side. A rejection
   * is a checklist of what is missing, so it is surfaced verbatim rather than
   * flattened into "could not publish".
   */
  const publish = async (listing: Listing, quiet = false) => {
    markBusy(listing.id);
    try {
      const res = await listingService.publish(listing.id);
      if (!quiet) addToast({ type: 'success', message: res.message ?? 'Listing published' });
      return true;
    } catch (err: unknown) {
      const message = errMessage(err, 'Could not publish this listing');
      // Pinned to the row as well as toasted, so it survives the toast timeout.
      setPublishErrors((prev) => ({ ...prev, [listing.id]: asProblems(message) }));
      if (!quiet) addToast({ type: 'error', message });
      return false;
    } finally {
      clearBusy(listing.id);
    }
  };

  const hide = async (listing: Listing, quiet = false) => {
    markBusy(listing.id);
    try {
      await listingService.unpublish(listing.id);
      if (!quiet) addToast({ type: 'success', message: 'Listing hidden from buyers' });
      return true;
    } catch (err: unknown) {
      if (!quiet) addToast({ type: 'error', message: errMessage(err, 'Could not hide this listing') });
      return false;
    } finally {
      clearBusy(listing.id);
    }
  };

  const remove = async (listing: Listing, quiet = false) => {
    markBusy(listing.id);
    try {
      await listingService.remove(listing.id);
      if (!quiet) addToast({ type: 'success', message: 'Listing deleted' });
      return true;
    } catch (err: unknown) {
      if (!quiet) addToast({ type: 'error', message: errMessage(err, 'Could not delete this listing') });
      return false;
    } finally {
      clearBusy(listing.id);
    }
  };

  const one = async (action: (l: Listing) => Promise<boolean>, l: Listing) => {
    const ok = await action(l);
    // A failed publish keeps its pinned checklist; reloading would clear it.
    if (ok) await load();
  };

  const bulk = async (kind: 'publish' | 'hide' | 'delete') => {
    const rows = listings.filter((l) => selected.has(l.id));
    const eligible = rows.filter((l) =>
      kind === 'publish' ? l.status !== 'PUBLISHED' && l.status !== 'REMOVED'
        : kind === 'hide' ? l.status === 'PUBLISHED'
          : l.status !== 'REMOVED',
    );
    if (eligible.length === 0) return;
    if (kind === 'delete' && !window.confirm(`Delete ${eligible.length} ${eligible.length === 1 ? 'listing' : 'listings'}? This cannot be undone.`)) {
      return;
    }
    const action = kind === 'publish' ? publish : kind === 'hide' ? hide : remove;
    const failed: Listing[] = [];
    for (const l of eligible) if (!(await action(l, true))) failed.push(l);
    const done = eligible.length - failed.length;
    const verb = kind === 'publish' ? 'published' : kind === 'hide' ? 'hidden' : 'deleted';
    addToast({
      type: failed.length ? 'error' : 'success',
      message: failed.length
        ? `${done} of ${eligible.length} ${verb}.${kind === 'publish' ? ' The rest show why on their rows.' : ''}`
        : `${done} ${done === 1 ? 'listing' : 'listings'} ${verb}.`,
    });
    // Reloading clears the pinned checklists, so a publish that left some
    // behind keeps the rows it has and only drops the selection.
    if (kind === 'publish' && failed.length) {
      const ok = new Set(eligible.filter((l) => !failed.includes(l)).map((l) => l.id));
      setListings((prev) => prev.map((l) => (ok.has(l.id) ? { ...l, status: 'PUBLISHED' } : l)));
      setSelected(new Set(failed.map((l) => l.id)));
    } else if (done > 0) await load();
  };

  const rows = useMemo(() => {
    if (!sort) return listings;
    const value = SORT_VALUE[sort.key];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...listings].sort((a, b) => (value(a) > value(b) ? dir : value(a) < value(b) ? -dir : 0));
  }, [listings, sort]);

  const allOnPage = rows.length > 0 && rows.every((l) => selected.has(l.id));
  const someOnPage = rows.some((l) => selected.has(l.id));

  const sortHeader = (key: SortKey, label: string, numeric = false) => {
    const on = sort?.key === key;
    const Icon = !on ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        className={numeric ? 'is-num' : undefined}
        aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        <button
          type="button"
          className={`ws-vxsort${on ? ' is-on' : ''}`}
          onClick={() =>
            setSort(on && sort.dir === 'desc' ? { key, dir: 'asc' } : on ? null : { key, dir: 'desc' })
          }
        >
          {label}
          <Icon size={14} aria-hidden />
        </button>
      </th>
    );
  };

  const exportCsv = () => {
    const blob = new Blob([csvOf(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'listings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = Boolean(appliedSearch) || tab !== 'ALL';
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <VendorPage>
      <VendorPageHead
        before={
          // Only a substore has one: its listings are reached THROUGH the
          // substore list, and nothing in the sidebar leads back there.
          parent && (
            <Link to={parent.to} className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--ghost ws-vxback">
              <ArrowLeft size={14} aria-hidden />
              {parent.label}
            </Link>
          )
        }
        title="Listings"
        description="Manage inventory, visibility, drafts, and performance from one working view."
        action={
          <Link to={`${productsBasePath}/new`} className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary">
            <Plus size={16} aria-hidden />
            Create listing
          </Link>
        }
      />

      {/* The second gate. Without this, a vendor who published everything and
          sees nothing on the marketplace has no way to know why. */}
      {storeLive === false && (
        <div className="ws-alert ws-alert--warning ws-vxalerts">
          <EyeOff size={16} aria-hidden />
          <span style={{ flex: 1 }}>
            Your store is not visible to buyers yet, so published listings stay private.
          </span>
          <Link to={dashboardPath} style={{ color: 'inherit', fontWeight: 600 }}>Activate</Link>
        </div>
      )}

      <div className="ws-vxlistings">
        {selected.size > 0 ? (
          <div className="ws-vxbulk" role="toolbar" aria-label="Bulk actions">
            <span className="ws-vxbulk__count ws-num" aria-live="polite">
              {selected.size} of {rows.length} selected
            </span>
            <button type="button" className="ws-vxbulk__btn" onClick={() => setSelected(new Set(rows.map((l) => l.id)))}>
              Select all
            </button>
            <button type="button" className="ws-vxbulk__btn" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <span className="ws-vxbulk__rule" aria-hidden />
            <button type="button" className="ws-vxbulk__btn" onClick={() => bulk('publish')}>Publish</button>
            <button type="button" className="ws-vxbulk__btn" onClick={() => bulk('hide')}>Hide</button>
            <span className="ws-vxbulk__rule" aria-hidden />
            <button type="button" className="ws-vxbulk__btn ws-vxbulk__btn--danger" onClick={() => bulk('delete')}>
              Delete
            </button>
          </div>
        ) : (
          <div className="ws-vxtools">
            <div className="ws-vxtools__start">
              <form
                role="search"
                className="ws-vxfield"
                onSubmit={(e) => {
                  e.preventDefault();
                  setAppliedSearch(search.trim());
                  setPage(1);
                }}
              >
                <Search size={16} aria-hidden />
                <label className="ws-sr-only" htmlFor="listing-search">Search listings</label>
                <input
                  id="listing-search"
                  type="text"
                  placeholder="Search listings"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    if (search.trim() !== appliedSearch) {
                      setAppliedSearch(search.trim());
                      setPage(1);
                    }
                  }}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearch('');
                      setAppliedSearch('');
                      setPage(1);
                      if (params.has('q')) setParams({}, { replace: true });
                    }}
                  >
                    <X size={14} aria-hidden />
                  </button>
                )}
              </form>

              <div className="ws-segmented" role="group" aria-label="Listing status">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={tab === t.key}
                    className={`ws-segmented__btn${tab === t.key ? ' is-active' : ''}`}
                    onClick={() => {
                      setTab(t.key);
                      setPage(1);
                    }}
                  >
                    {t.label}
                    {counts.data && <span className="ws-pill__count ws-num">{counts.data[t.key]}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="ws-vxtools__end">
              <button
                type="button"
                className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--outline"
                aria-label="Export listings"
                title="Export this page as CSV"
                disabled={rows.length === 0}
                onClick={exportCsv}
              >
                <Download size={16} aria-hidden />
              </button>
              <Link to={`${productsBasePath}/new`} className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary">
                <Plus size={16} aria-hidden />
                New listing
              </Link>
            </div>
          </div>
        )}

        <div className="ws-vxscroll">
          <table className="ws-vxtable ws-vxtable--full">
            <caption className="ws-sr-only">Your listings</caption>
            <thead>
              <tr>
                <th scope="col" className="ws-vxtable__check">
                  <input
                    type="checkbox"
                    className="ws-cfcheck__box ws-vxcheck"
                    aria-label="Select all rows"
                    checked={allOnPage}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPage && !allOnPage;
                    }}
                    onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((l) => l.id)))}
                  />
                </th>
                {sortHeader('name', 'Listing')}
                {sortHeader('status', 'Status')}
                {sortHeader('price', 'Price', true)}
                {sortHeader('views', 'Views', true)}
                {sortHeader('inquiries', 'Inquiries', true)}
                {sortHeader('posted', 'Posted')}
                <th scope="col" className="ws-vxtable__actions"><span className="ws-sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: Math.min(pageSize, 8) }, (_, i) => (
                    <tr key={i} className="ws-vxtable__skel">
                      <td />
                      <td colSpan={7}><div className="ws-skeleton" style={{ height: 48 }} /></td>
                    </tr>
                  ))
                : rows.map((l) => {
                    const busy = busyIds.has(l.id);
                    // A real rejection wins over the precomputed annotation:
                    // it is both fresher and authoritative, and it covers
                    // gates the annotation does not model.
                    const rejected = publishErrors[l.id];
                    // Absent on older server builds: treat unknown as
                    // publishable and let the endpoint be the authority.
                    const blockers = rejected ?? (l.compliance?.compliant === false ? l.compliance.problems : []);
                    const thumb = firstImage(l);
                    const place = formatLocation([l.city, l.state], l.country);
                    const posted = postedAgo(l.publishedAt ?? l.updatedAt);
                    const menu: RowMenuItem[] =
                      l.status === 'REMOVED'
                        ? [{ label: 'Removed by admin. Contact support', onSelect: () => {}, disabled: true }]
                        : [
                            { label: 'Edit', onSelect: () => navigate(`${productsBasePath}/${l.id}`) },
                            l.status === 'PUBLISHED'
                              ? { label: 'Hide listing', onSelect: () => one(hide, l), disabled: busy }
                              : {
                                  label: 'Publish',
                                  onSelect: () => one(publish, l),
                                  disabled: busy || blockers.length > 0,
                                },
                            { label: 'Delete', danger: true, onSelect: () => {
                              if (window.confirm(`Delete "${l.name}"? This cannot be undone.`)) void one(remove, l);
                            }, disabled: busy },
                          ];

                    return (
                      <tr key={l.id} aria-selected={selected.has(l.id)} className={busy ? 'is-busy' : undefined}>
                        <td className="ws-vxtable__check">
                          <input
                            type="checkbox"
                            className="ws-cfcheck__box ws-vxcheck"
                            aria-label={`Select ${l.name}`}
                            checked={selected.has(l.id)}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(l.id)) next.delete(l.id);
                                else next.add(l.id);
                                return next;
                              })
                            }
                          />
                        </td>
                        <th scope="row">
                          <div className="ws-vxtable__id">
                            {/* Fixed square so rows keep a common height
                                whether or not a listing has a photo yet. */}
                            {thumb ? (
                              <img src={thumb} alt="" className="ws-vxthumb ws-vxthumb--xl" onError={imageFallback(PRODUCT_PLACEHOLDER)} />
                            ) : (
                              <span className="ws-vxthumb ws-vxthumb--xl" title="No photo" />
                            )}
                            <span className="ws-vxtable__who">
                              <Link to={`${productsBasePath}/${l.id}`} className="ws-vxtable__title">{l.name}</Link>
                              <span className="ws-vxtable__sub">
                                {[l.condition?.toLowerCase(), l.category?.name ?? 'No category', place].filter(Boolean).join(' · ')}
                              </span>
                              {/* Why this listing cannot go live, stated before
                                  the vendor clicks Publish. Suppressed once
                                  published: it is already on the marketplace. */}
                              {blockers.length > 0 && l.status !== 'PUBLISHED' && (
                                <span className="ws-vxtable__blockers">
                                  {rejected && <strong>Publish failed:</strong>}
                                  <ul>
                                    {blockers.map((problem) => <li key={problem}>{problem}</li>)}
                                  </ul>
                                </span>
                              )}
                            </span>
                          </div>
                        </th>
                        <td><ListingStatus status={l.status} /></td>
                        <td className="is-num"><span className="ws-vxtable__bigprice">{priceLabel(l)}</span></td>
                        <td className="is-num">{l.viewCount.toLocaleString('en-NG')}</td>
                        <td className="is-num">{l.inquiryCount.toLocaleString('en-NG')}</td>
                        <td><span className="ws-vxtable__posted">{posted ?? '—'}</span></td>
                        <td className="ws-vxtable__actions">
                          <RowMenu items={menu} label={`Actions for ${l.name}`} />
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>

          {!loading && rows.length === 0 && (
            <div className="ws-vxempty">
              <span className="ws-cxempty__icon"><Package size={20} aria-hidden /></span>
              <p className="ws-cxempty__title">{filtered ? 'No listings match' : 'No listings yet'}</p>
              <p className="ws-cxempty__body">
                {filtered
                  ? 'Try another status or search.'
                  : 'Listings you create show up here, with their views and inquiries.'}
              </p>
              <div className="ws-cxempty__action">
                {filtered ? (
                  <button
                    type="button"
                    className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--outline"
                    onClick={() => {
                      setSearch('');
                      setAppliedSearch('');
                      setTab('ALL');
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link to={`${productsBasePath}/new`} className="ws-ldbtn ws-ldbtn--xs ws-ldbtn--primary">
                    <Plus size={14} aria-hidden />
                    Create your first listing
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="ws-vxpager">
            <span className="ws-vxpager__range ws-num">
              {from}–{to} of {total.toLocaleString('en-NG')}
            </span>
            <nav aria-label="Table pages" className="ws-vxpager__nav">
              <button
                type="button"
                className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <ul>
                {pageList(page, totalPages).map((p, i) =>
                  p === 'gap' ? (
                    <li key={`gap-${i}`} aria-hidden className="ws-vxpager__gap">…</li>
                  ) : (
                    <li key={p}>
                      <button
                        type="button"
                        aria-label={`Page ${p}`}
                        aria-current={p === page ? 'page' : undefined}
                        className={`ws-vxpager__page${p === page ? ' is-on' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </li>
                  ),
                )}
              </ul>
              <button
                type="button"
                className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </nav>
            <label className="ws-vxpager__size">
              <span>Rows</span>
              <select
                className="ws-select ws-select--sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>
    </VendorPage>
  );
}
