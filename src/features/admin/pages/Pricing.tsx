import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Pencil, Plus, X } from 'lucide-react';
import {
  adminBillingService,
  intervalLabel,
  usd,
  type AdminPlan,
  type AdminPlanCreateInput,
  type PlanKind,
} from '@/features/admin/billing';
import { useUIStore } from '@/shared/store/uiStore';
import { toApiError } from '@/shared/lib/api';

/**
 * Subscription pricing: what stores and malls pay to be visible. Vendors see
 * these plans as they are saved here (registration, their dashboard, the
 * renewal charge), so there is no separate publish step.
 *
 * A price change reaches each subscriber at their next renewal. A period
 * already paid, or one being retried in grace, keeps the price it started at.
 */

type Draft = {
  code: string;
  kind: PlanKind;
  name: string;
  price: string; // dollars, as typed
  billing: 'months' | 'days';
  every: string;
  graceDays: string;
  listingLimit: string; // blank = unlimited
  substoreLimit: string; // blank = unlimited
  perks: string; // one per line
  sortOrder: string;
  isActive: boolean;
};

function toDraft(plan?: AdminPlan, kind: PlanKind = 'STORE'): Draft {
  return {
    code: plan?.code ?? '',
    kind: plan?.kind ?? kind,
    name: plan?.name ?? '',
    price: plan ? String(plan.amountMinor / 100) : '',
    billing: !plan || plan.intervalMonths ? 'months' : 'days',
    every: plan ? String(plan.intervalMonths ?? plan.intervalDays) : '1',
    graceDays: plan ? String(plan.graceDays) : '7',
    listingLimit: plan?.listingLimit != null ? String(plan.listingLimit) : '',
    substoreLimit: plan?.substoreLimit != null ? String(plan.substoreLimit) : kind === 'MALL' ? '6' : '',
    perks: plan?.perks.join('\n') ?? '',
    sortOrder: plan ? String(plan.sortOrder) : '0',
    isActive: plan?.isActive ?? true,
  };
}

const int = (v: string) => (v.trim() === '' ? null : Number(v));

/** Returns the payload, or an error message for the first bad field. */
function fromDraft(d: Draft): { input: AdminPlanCreateInput } | { error: string } {
  const amount = Number(d.price);
  if (!d.name.trim()) return { error: 'Give the plan a name.' };
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Enter a price in dollars, for example 100.' };
  const every = int(d.every);
  if (!every || every < 1 || !Number.isInteger(every)) return { error: 'The billing interval must be a whole number of 1 or more.' };
  const grace = int(d.graceDays);
  if (grace == null || grace < 0 || !Number.isInteger(grace)) return { error: 'Grace days must be 0 or more.' };
  const listingLimit = int(d.listingLimit);
  if (listingLimit != null && (!Number.isInteger(listingLimit) || listingLimit < 1)) {
    return { error: 'Listing limit must be a whole number, or blank for unlimited.' };
  }
  const substoreLimit = d.kind === 'MALL' ? int(d.substoreLimit) : null;
  if (substoreLimit != null && (!Number.isInteger(substoreLimit) || substoreLimit < 1)) {
    return { error: 'Substore limit must be a whole number, or blank for unlimited.' };
  }

  return {
    input: {
      code: d.code.trim(),
      kind: d.kind,
      name: d.name.trim(),
      amountMinor: Math.round(amount * 100),
      intervalMonths: d.billing === 'months' ? every : null,
      // The server's day-based fallback; a monthly plan still carries one.
      intervalDays: d.billing === 'days' ? every : 30,
      graceDays: grace,
      listingLimit,
      substoreLimit,
      perks: d.perks.split('\n').map((p) => p.trim()).filter(Boolean),
      sortOrder: int(d.sortOrder) ?? 0,
      isActive: d.isActive,
    },
  };
}

function subscriberCount(plan: AdminPlan): number {
  return plan.subscribers.active + plan.subscribers.grace;
}

function PlanDialog({
  plan,
  kind,
  onClose,
  onSaved,
}: {
  plan: AdminPlan | null;
  kind: PlanKind;
  onClose: () => void;
  onSaved: (plan: AdminPlan) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(plan ?? undefined, kind));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const editing = !!plan;
  const priceChanged = editing && Math.round(Number(draft.price) * 100) !== plan.amountMinor;
  const affected = plan ? subscriberCount(plan) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = fromDraft(draft);
    if ('error' in parsed) {
      setError(parsed.error);
      return;
    }
    if (!editing && !/^[a-z0-9-]{2,40}$/.test(parsed.input.code)) {
      setError('The code must be 2 to 40 lowercase letters, numbers or hyphens.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Code and kind are fixed once a plan exists, so an edit sends neither.
      const changes: Partial<AdminPlanCreateInput> = { ...parsed.input };
      delete changes.code;
      delete changes.kind;
      const saved = editing
        ? await adminBillingService.updatePlan(plan.id, changes)
        : await adminBillingService.createPlan(parsed.input);
      onSaved(saved);
    } catch (err) {
      const e2 = toApiError(err, 'Could not save the plan');
      setError((e2.errors && Object.values(e2.errors)[0]) || e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ws-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="ws-modal ws-modal--wide" role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title" onSubmit={submit}>
        <div className="ws-modal__head">
          <h2 id="plan-dialog-title" className="ws-modal__title">
            {editing ? `Edit ${plan.name}` : `New ${draft.kind === 'MALL' ? 'mall' : 'store'} plan`}
          </h2>
          <button type="button" className="ws-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="ws-alert" role="alert">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div className="ws-plangrid">
          <label className="ws-formfield">
            <span className="ws-formfield__label">Name</span>
            <input className="ws-field" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Standard" required />
          </label>
          <label className="ws-formfield">
            <span className="ws-formfield__label">Code</span>
            <input
              className="ws-field"
              value={draft.code}
              onChange={(e) => set('code', e.target.value.toLowerCase())}
              placeholder="standard"
              disabled={editing}
              required
            />
            <span className="ws-formfield__hint">{editing ? 'Fixed once created.' : 'Lowercase, for example "premium".'}</span>
          </label>

          <label className="ws-formfield">
            <span className="ws-formfield__label">Price (USD)</span>
            <input className="ws-field ws-num" inputMode="decimal" value={draft.price} onChange={(e) => set('price', e.target.value)} placeholder="100" required />
          </label>
          <div className="ws-formfield">
            <span className="ws-formfield__label">Billed every</span>
            <div style={{ display: 'flex', gap: 'var(--ws-space-2)' }}>
              <input
                className="ws-field ws-num"
                inputMode="numeric"
                aria-label="Billing interval"
                value={draft.every}
                onChange={(e) => set('every', e.target.value)}
                style={{ width: 88 }}
              />
              <select className="ws-select" aria-label="Interval unit" value={draft.billing} onChange={(e) => set('billing', e.target.value as Draft['billing'])}>
                <option value="months">month(s)</option>
                <option value="days">day(s)</option>
              </select>
            </div>
          </div>

          <label className="ws-formfield">
            <span className="ws-formfield__label">Grace days</span>
            <input className="ws-field ws-num" inputMode="numeric" value={draft.graceDays} onChange={(e) => set('graceDays', e.target.value)} />
            <span className="ws-formfield__hint">How long a vendor stays visible after a failed renewal.</span>
          </label>
          <label className="ws-formfield">
            <span className="ws-formfield__label">Listing limit</span>
            <input className="ws-field ws-num" inputMode="numeric" value={draft.listingLimit} onChange={(e) => set('listingLimit', e.target.value)} placeholder="Unlimited" />
          </label>

          {draft.kind === 'MALL' && (
            <label className="ws-formfield">
              <span className="ws-formfield__label">Substore limit</span>
              <input className="ws-field ws-num" inputMode="numeric" value={draft.substoreLimit} onChange={(e) => set('substoreLimit', e.target.value)} placeholder="Unlimited" />
            </label>
          )}
          <label className="ws-formfield">
            <span className="ws-formfield__label">Display order</span>
            <input className="ws-field ws-num" inputMode="numeric" value={draft.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            <span className="ws-formfield__hint">Lower shows first.</span>
          </label>

          <label className="ws-formfield ws-plangrid__wide">
            <span className="ws-formfield__label">Perks</span>
            <textarea
              className="ws-field ws-textarea"
              rows={4}
              value={draft.perks}
              onChange={(e) => set('perks', e.target.value)}
              placeholder={'One per line\nUnlimited listings\nBuyer chat'}
            />
          </label>

          <label className="ws-plangrid__wide ws-planswitch">
            <input
              type="checkbox"
              className="ws-switch"
              checked={draft.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              disabled={editing && plan.isDefault && plan.isActive}
            />
            <span>
              <strong>Available to vendors</strong>
              <span className="ws-caption ws-muted">
                {editing && plan.isDefault
                  ? 'This is the plan new signups are put on, so it stays available.'
                  : 'Turning this off hides the plan from new signups. Existing subscribers keep it.'}
              </span>
            </span>
          </label>
        </div>

        {priceChanged && affected > 0 && (
          <div className="ws-alert ws-alert--info" role="status">
            <AlertCircle size={16} aria-hidden />
            <span>
              {affected} subscriber{affected === 1 ? '' : 's'} on this plan will be charged{' '}
              <strong className="ws-num">{usd(Math.round(Number(draft.price) * 100))}</strong> from their next renewal.
              Periods already paid keep the old price.
            </span>
          </div>
        )}

        <div className="ws-modal__foot">
          <button type="button" className="ws-btn ws-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="ws-btn ws-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create plan'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlanCard({ plan, onEdit }: { plan: AdminPlan; onEdit: () => void }) {
  const subs = subscriberCount(plan);
  return (
    <article className={`ws-card ws-plancard${plan.isActive ? '' : ' is-inactive'}`}>
      <header className="ws-plancard__head">
        <div>
          <h3 className="ws-plancard__name">{plan.name}</h3>
          <span className="ws-caption ws-muted">{plan.code}</span>
        </div>
        <div className="ws-plancard__badges">
          {plan.isDefault && <span className="ws-badge ws-badge--brand">Default</span>}
          {!plan.isActive && <span className="ws-badge ws-badge--neutral">Hidden</span>}
        </div>
      </header>

      <p className="ws-plancard__price">
        <span className="ws-num">{usd(plan.amountMinor)}</span>
        <span className="ws-muted"> {intervalLabel(plan)}</span>
      </p>

      <dl className="ws-plancard__facts">
        <div><dt>Grace</dt><dd className="ws-num">{plan.graceDays} day{plan.graceDays === 1 ? '' : 's'}</dd></div>
        <div><dt>Listings</dt><dd className="ws-num">{plan.listingLimit ?? 'Unlimited'}</dd></div>
        {plan.kind === 'MALL' && (
          <div><dt>Substores</dt><dd className="ws-num">{plan.substoreLimit ?? 'Unlimited'}</dd></div>
        )}
        <div>
          <dt>Subscribers</dt>
          <dd className="ws-num">
            {subs}
            {plan.subscribers.grace > 0 && <span className="ws-muted"> ({plan.subscribers.grace} in grace)</span>}
          </dd>
        </div>
      </dl>

      {plan.perks.length > 0 && (
        <ul className="ws-plancard__perks">
          {plan.perks.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary ws-plancard__edit" onClick={onEdit}>
        <Pencil size={14} aria-hidden />
        Edit
      </button>
    </article>
  );
}

export default function AdminPricing() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ plan: AdminPlan | null; kind: PlanKind } | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await adminBillingService.getPlans());
      setError(null);
    } catch (err) {
      setError(toApiError(err, 'Could not load plans').message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = (saved: AdminPlan) => {
    setDialog(null);
    addToast({
      type: 'success',
      message: dialog?.plan ? `${saved.name} updated` : `${saved.name} created`,
      description: dialog?.plan ? 'A new price applies to each subscriber from their next renewal.' : undefined,
    });
    // Reload rather than patch in place: subscriber counts and the default
    // flag are computed by the server.
    load();
  };

  const groups: { kind: PlanKind; title: string; blurb: string }[] = [
    { kind: 'STORE', title: 'Store plans', blurb: 'What a seller pays to keep their store visible.' },
    { kind: 'MALL', title: 'Mall plans', blurb: 'What a mall owner pays; it covers every substore in the mall.' },
  ];

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Pricing</h1>
          <p className="ws-body ws-muted" style={{ marginTop: 4 }}>
            Prices are in US dollars and charged to the vendor's WorldStreet wallet. Changes reach each subscriber at their next renewal.
          </p>
        </div>
      </div>

      {error ? (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      ) : (
        <div className="ws-stack--lg">
          {groups.map((g) => {
            const list = plans.filter((p) => p.kind === g.kind);
            return (
              <section key={g.kind}>
                <div className="ws-sectionhead" style={{ marginBottom: 'var(--ws-space-4)' }}>
                  <div>
                    <h2 className="ws-h2">{g.title}</h2>
                    <p className="ws-caption ws-muted">{g.blurb}</p>
                  </div>
                  <button type="button" className="ws-btn ws-btn--sm ws-btn--secondary" onClick={() => setDialog({ plan: null, kind: g.kind })}>
                    <Plus size={14} aria-hidden />
                    New plan
                  </button>
                </div>
                <div className="ws-plancards">
                  {loading && plans.length === 0
                    ? [0, 1].map((i) => <div key={i} className="ws-skeleton" style={{ height: 220, borderRadius: 'var(--ws-radius-xl)' }} />)
                    : list.length === 0
                      ? <p className="ws-body ws-muted">No {g.kind === 'MALL' ? 'mall' : 'store'} plans yet.</p>
                      : list.map((plan) => (
                          <PlanCard key={plan.id} plan={plan} onEdit={() => setDialog({ plan, kind: plan.kind })} />
                        ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {dialog && (
        <PlanDialog
          plan={dialog.plan}
          kind={dialog.kind}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
