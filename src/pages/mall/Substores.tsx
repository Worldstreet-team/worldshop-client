import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Store, Trash2, X } from 'lucide-react';
import { mallService, type Substore } from '@/services/mallService';
import { NIGERIAN_STATES } from '@/utils/nigerianStates';
import { toApiError } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

/**
 * Substore management. Creating one is deliberately light — name and an
 * optional location (it defaults to the mall's) — because the real work
 * happens in each substore's own listings console, linked per row.
 */

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  // DRAFT on a substore means owner-archived (it gave its plan slot back).
  DRAFT: { cls: 'ws-badge--neutral', label: 'Archived' },
  ACTIVE: { cls: 'ws-badge--success', label: 'Live' },
  GRACE: { cls: 'ws-badge--warning', label: 'Grace' },
  EXPIRED: { cls: 'ws-badge--danger', label: 'Expired' },
  SUSPENDED: { cls: 'ws-badge--danger', label: 'Suspended' },
  BANNED: { cls: 'ws-badge--danger', label: 'Banned' },
};

export default function MallSubstores() {
  const [substores, setSubstores] = useState<Substore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({ name: '', description: '', state: '', city: '' });
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    try {
      const res = await mallService.listSubstores();
      setSubstores(res.data);
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Failed to load substores').message });
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
      addToast({ type: 'error', message: 'Substore name must be at least 3 characters' });
      return;
    }
    setCreating(true);
    try {
      await mallService.createSubstore({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        state: form.state || undefined,
        city: form.city.trim() || undefined,
      });
      addToast({ type: 'success', message: 'Substore created' });
      setForm({ name: '', description: '', state: '', city: '' });
      setShowCreate(false);
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not create the substore').message });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (s: Substore) => {
    setBusyIds((prev) => new Set(prev).add(s.id));
    try {
      await mallService.restoreSubstore(s.id);
      addToast({ type: 'success', message: 'Substore restored — republish its listings when ready' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not restore the substore').message });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  };

  const handleArchive = async (s: Substore) => {
    if (!window.confirm(`Remove "${s.name}"? An empty substore is deleted; one with history is hidden instead.`)) {
      return;
    }
    setBusyIds((prev) => new Set(prev).add(s.id));
    try {
      const res = await mallService.archiveSubstore(s.id);
      addToast({
        type: 'success',
        message: res.data.deleted ? 'Substore deleted' : 'Substore archived (it had history worth keeping)',
      });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not remove the substore').message });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(s.id);
        return next;
      });
    }
  };

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Substores</h1>
          <p className="ws-page__sub">The stores inside your mall — all covered by one subscription.</p>
        </div>
        <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? <X size={14} aria-hidden /> : <Plus size={14} aria-hidden />}
          {showCreate ? 'Close' : 'Add Substore'}
        </button>
      </div>

      {showCreate && (
        <form className="ws-card ws-stack--md" style={{ marginBottom: 'var(--ws-space-4)' }} onSubmit={handleCreate}>
          <div className="ws-formgrid">
            <div className="ws-formfield">
              <label htmlFor="ss-name" className="ws-formfield__label">Substore Name *</label>
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
              <label htmlFor="ss-state" className="ws-formfield__label">State</label>
              <select
                id="ss-state"
                className="ws-select"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              >
                <option value="">Same as the mall</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
                placeholder="What does this substore sell?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <button type="submit" className="ws-btn ws-btn--primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Substore'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="ws-skeleton" style={{ height: 240, borderRadius: 'var(--ws-radius-xl)' }} />
      ) : substores.length === 0 ? (
        <div className="ws-empty">
          <div className="ws-empty__icon"><Store size={26} aria-hidden /></div>
          <h2 className="ws-title">No substores yet</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '44ch' }}>
            A substore is a full storefront — its own page, catalogue, reviews
            and messages. Create your first one to start filling your mall.
          </p>
          <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} aria-hidden />
            Add Substore
          </button>
        </div>
      ) : (
        <div className="ws-stack--sm">
          {substores.map((s) => {
            const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.DRAFT;
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
                    {[s.city, s.state].filter(Boolean).join(', ') || '—'}
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
                      <Link to={`/mall/substores/${s.id}/products`} className="ws-btn ws-btn--sm ws-btn--secondary">
                        <Package size={14} aria-hidden />
                        Listings
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
