import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Pencil, Plus, Store, Trash2, X } from 'lucide-react';
import { mallService, type Substore } from '@/features/malls/api';
import { formatLocation } from '@/shared/utils/locations';
import CountrySelect from '@/shared/components/location/CountrySelect';
import StateSelect from '@/shared/components/location/StateSelect';
import { toApiError } from '@/shared/lib/api';
import { useUIStore } from '@/shared/store/uiStore';

/**
 * Store management. Creating one is deliberately light — name and an
 * optional location (it defaults to the mall's) — because the real work
 * happens in each store's own listings console, linked per row.
 *
 * "Substore" survives in the types, service methods and API paths; the
 * product calls these plain stores, so only what a user reads says "store".
 */

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  // DRAFT on a store means owner-archived (it gave its plan slot back).
  DRAFT: { cls: 'ws-badge--neutral', label: 'Archived' },
  ACTIVE: { cls: 'ws-badge--success', label: 'Live' },
  GRACE: { cls: 'ws-badge--warning', label: 'Grace' },
  EXPIRED: { cls: 'ws-badge--danger', label: 'Expired' },
  SUSPENDED: { cls: 'ws-badge--danger', label: 'Suspended' },
  BANNED: { cls: 'ws-badge--danger', label: 'Banned' },
};

/**
 * A store under a mall that has never been paid for is EXPIRED — the same
 * status a lapsed store carries, because visibility cascades from the mall.
 * Showing both as a red "Expired" is what made QA read an unpaid mall as a
 * bug. Before the first payment it is not expired, it is not started yet.
 */
const NOT_ACTIVATED = { cls: 'ws-badge--neutral', label: 'Not activated' };

export default function MallSubstores() {
  const [substores, setSubstores] = useState<Substore[]>([]);
  // Null means "no cap on this plan"; undefined means not loaded yet.
  const [limit, setLimit] = useState<number | null | undefined>(undefined);
  const [mallNeverPaid, setMallNeverPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', description: '', country: '', state: '', city: '' });
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    try {
      // The mall comes along for the plan's store cap: without it the only
      // way to discover the limit is to hit the server's 409.
      const [res, mallRes] = await Promise.all([
        mallService.listSubstores(),
        mallService.getMyMall(),
      ]);
      setSubstores(res.data);
      setLimit(mallRes.data.subscription?.plan?.substoreLimit ?? null);
      setMallNeverPaid(mallRes.data.status === 'DRAFT');
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Failed to load stores').message });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 3) {
      addToast({ type: 'error', message: 'Store name must be at least 3 characters' });
      return;
    }
    if (form.country && !form.state.trim()) {
      addToast({ type: 'error', message: 'Choose a state or region in that country' });
      return;
    }
    setCreating(true);
    try {
      await mallService.createSubstore({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        country: form.country || undefined,
        state: form.state.trim() || undefined,
        city: form.city.trim() || undefined,
      });
      addToast({ type: 'success', message: 'Store created' });
      setForm({ name: '', description: '', country: '', state: '', city: '' });
      setShowCreate(false);
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not create the store').message });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (s: Substore) => {
    setBusyIds((prev) => new Set(prev).add(s.id));
    try {
      await mallService.restoreSubstore(s.id);
      addToast({ type: 'success', message: 'Store restored — republish its listings when ready' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not restore the store').message });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  };

  const handleArchive = async (s: Substore) => {
    if (!window.confirm(`Remove "${s.name}"? An empty store is deleted; one with history is hidden instead.`)) {
      return;
    }
    setBusyIds((prev) => new Set(prev).add(s.id));
    try {
      const res = await mallService.archiveSubstore(s.id);
      addToast({
        type: 'success',
        message: res.data.deleted ? 'Store deleted' : 'Store archived (it had history worth keeping)',
      });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not remove the store').message });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  };

  // Archived stores gave their slot back, so they do not count — the same
  // rule the server applies via Mall.substoreCount.
  const usedSlots = substores.filter((s) => s.status !== 'DRAFT').length;
  const atCap = limit != null && usedSlots >= limit;

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Stores</h1>
          <p className="ws-page__sub">
            The stores inside your mall — all covered by one subscription.
            {limit != null && (
              <>
                {' '}
                <span className="ws-num">{usedSlots} of {limit}</span> used.
              </>
            )}
          </p>
        </div>
        <button
          className="ws-btn ws-btn--sm ws-btn--primary"
          onClick={() => setShowCreate((v) => !v)}
          disabled={atCap && !showCreate}
          title={atCap ? `Your plan allows up to ${limit} stores` : undefined}
        >
          {showCreate ? <X size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
          {showCreate ? 'Close' : 'Add Store'}
        </button>
      </div>

      {mallNeverPaid && substores.length > 0 && (
        <div className="ws-alert" role="status" style={{ marginBottom: 'var(--ws-space-4)' }}>
          <span>
            None of these stores is visible to buyers yet — your mall
            subscription has not been activated. Activate it from the{' '}
            <Link to="/mall" style={{ color: 'inherit', fontWeight: 600 }}>dashboard</Link>{' '}
            and every store here goes live with it.
          </span>
        </div>
      )}

      {atCap && !showCreate && (
        <div className="ws-alert" role="status" style={{ marginBottom: 'var(--ws-space-4)' }}>
          <span>
            You have used all {limit} stores on your plan. Remove one to free a
            slot, or archive a store you are not trading from.
          </span>
        </div>
      )}

      {showCreate && (
        <form className="ws-card ws-stack--md" style={{ marginBottom: 'var(--ws-space-4)' }} onSubmit={handleCreate}>
          <div className="ws-formgrid">
            <div className="ws-formfield">
              <label htmlFor="ss-name" className="ws-formfield__label">Store Name *</label>
              <input
                id="ss-name"
                type="text"
                className="ws-field"
                placeholder="e.g. Gadget Corner"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="ws-formfield">
              <label htmlFor="ss-country" className="ws-formfield__label">Country</label>
              <CountrySelect
                id="ss-country"
                value={form.country}
                placeholder="Same as the mall"
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, state: '' }))}
              />
            </div>
            <div className="ws-formfield">
              <label htmlFor="ss-state" className="ws-formfield__label">State / Region</label>
              <StateSelect
                id="ss-state"
                country={form.country}
                value={form.state}
                placeholder="Same as the mall"
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div className="ws-formfield">
              <label htmlFor="ss-city" className="ws-formfield__label">City / Area</label>
              <input
                id="ss-city"
                type="text"
                className="ws-field"
                placeholder="Optional"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="ws-formfield ws-formgrid__full">
              <label htmlFor="ss-desc" className="ws-formfield__label">Description</label>
              <textarea
                id="ss-desc"
                className="ws-textarea"
                placeholder="What does this store sell?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <button type="submit" className="ws-btn ws-btn--primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Store'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="ws-skeleton" style={{ height: 240, borderRadius: 'var(--ws-radius-xl)' }} />
      ) : substores.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Store size={26} aria-hidden /></div>
          <h2 className="ws-title">No stores yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            A store is a full storefront — its own page, catalogue, reviews
            and messages. Create your first one to start filling your mall.
          </p>
          <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} aria-hidden />
            Add Store
          </button>
        </div>
      ) : (
        <div className="ws-stack--sm">
          {substores.map((s) => {
            const badge =
              mallNeverPaid && s.status === 'EXPIRED'
                ? NOT_ACTIVATED
                : STATUS_BADGE[s.status] ?? STATUS_BADGE.DRAFT;
            const busy = busyIds.has(s.id);
            return (
              <div
                key={s.id}
                className="ws-card"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', flexWrap: 'wrap' }}
              >
                <span className="ws-avatar ws-avatar--l" aria-hidden>
                  {s.logo ? <img src={s.logo} alt="" /> : s.name.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>{s.name}</p>
                  <p className="ws-caption ws-muted" style={{ margin: 0 }}>
                    {formatLocation([s.city, s.state], s.country) || '—'}
                    {typeof s.listingCount === 'number' && ` · ${s.listingCount} listing${s.listingCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                <span className={`ws-badge ${badge.cls}`}>{badge.label}</span>
                <div style={{ display: 'flex', gap: 'var(--ws-space-2)' }}>
                  {s.status === 'DRAFT' ? (
                    // Archived: its slot is free and its catalogue is locked —
                    // the only action is bringing it back.
                    <button
                      className="ws-btn ws-btn--sm ws-btn--secondary"
                      onClick={() => handleRestore(s)}
                      disabled={busy}
                    >
                      Restore
                    </button>
                  ) : (
                    <>
                      <Link to={`/mall/stores/${s.id}/products`} className="ws-btn ws-btn--sm ws-btn--secondary">
                        <Package size={14} aria-hidden />
                        Listings
                      </Link>
                      <Link
                        to={`/mall/stores/${s.id}/edit`}
                        className="ws-btn ws-btn--sm ws-btn--secondary"
                      >
                        <Pencil size={14} aria-hidden />
                        Edit
                      </Link>
                      <Link to={`/stores/${s.slug}`} className="ws-btn ws-btn--sm ws-btn--ghost">
                        View
                      </Link>
                      <button
                        className="ws-btn ws-btn--sm ws-btn--ghost"
                        onClick={() => handleArchive(s)}
                        disabled={busy}
                        aria-label={`Remove ${s.name}`}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
