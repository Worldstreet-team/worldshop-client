import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Building2, CheckCircle2, CreditCard, ExternalLink, Store,
} from 'lucide-react';
import { mallService, type MyMall } from '@/services/mallService';
import { toApiError } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

/**
 * Mall owner dashboard: the subscription that keeps the whole mall (and every
 * substore in it) visible, plus a substore overview. One $100/month
 * subscription is the only bill — substores never charge separately, which is
 * the value proposition and worth restating where the money is managed.
 */

const formatUsd = (minor: number) => `$${(minor / 100).toFixed(2)}`;
const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'ws-badge--neutral', label: 'Draft — not visible yet' },
  ACTIVE: { cls: 'ws-badge--success', label: 'Live' },
  GRACE: { cls: 'ws-badge--warning', label: 'Payment overdue — still visible' },
  EXPIRED: { cls: 'ws-badge--danger', label: 'Expired — hidden from buyers' },
  SUSPENDED: { cls: 'ws-badge--danger', label: 'Suspended' },
  BANNED: { cls: 'ws-badge--danger', label: 'Banned' },
};

export default function MallDashboard() {
  const [mall, setMall] = useState<MyMall | null>(null);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    try {
      const res = await mallService.getMyMall();
      setMall(res.data);
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Failed to load your mall').message });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCharge = async () => {
    setCharging(true);
    try {
      const res = await mallService.chargeSubscription();
      addToast({
        type: 'success',
        message: res.data.alreadyPaid
          ? 'This period is already paid for.'
          : 'Subscription active — your mall and substores are now visible.',
      });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not complete the charge').message });
    } finally {
      setCharging(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Stop auto-renewal? Your mall stays visible until the end of the paid period.')) return;
    setCancelling(true);
    try {
      await mallService.cancelSubscription();
      addToast({ type: 'success', message: 'Auto-renewal stopped.' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not cancel the subscription').message });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Mall Dashboard</h1></div>
        <div className="ws-skeleton" style={{ height: 280, borderRadius: 'var(--ws-radius-xl)' }} />
      </div>
    );
  }

  if (!mall) {
    return (
      <div className="ws-page">
        <div className="ws-empty">
          <div className="ws-empty__icon"><Building2 size={26} aria-hidden /></div>
          <h2 className="ws-title">Could not load your mall</h2>
          <button className="ws-btn ws-btn--sm ws-btn--primary" onClick={() => { setLoading(true); load(); }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const badge = STATUS_BADGE[mall.status] ?? STATUS_BADGE.DRAFT;
  const sub = mall.subscription;
  const plan = sub?.plan;
  const needsPayment =
    !mall.isPubliclyVisible || sub?.status === 'GRACE' || sub?.status === 'PENDING_PAYMENT';

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">{mall.name}</h1>
          <p className="ws-page__sub">
            <span className={`ws-badge ${badge.cls}`}>{badge.label}</span>
          </p>
        </div>
        {mall.isPubliclyVisible && (
          <Link to={`/malls/${mall.slug}`} className="ws-btn ws-btn--sm ws-btn--secondary">
            <ExternalLink size={14} aria-hidden />
            View Mall Page
          </Link>
        )}
      </div>

      {needsPayment && (
        <div className="ws-alert ws-alert--warning" style={{ marginBottom: 'var(--ws-space-4)' }}>
          <AlertCircle size={16} aria-hidden />
          <span style={{ flex: 1 }}>
            {mall.status === 'DRAFT'
              ? 'Your mall is not visible to buyers yet. Activate the subscription to go live — every substore goes live with it.'
              : 'Your subscription needs payment to keep the mall and its substores visible.'}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--ws-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Subscription */}
        <section className="ws-card ws-stack--md">
          <h2 className="ws-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
            <CreditCard size={18} aria-hidden /> Subscription
          </h2>

          <dl className="ws-stack--sm" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt className="ws-caption ws-muted">Plan</dt>
              <dd className="ws-num" style={{ margin: 0 }}>
                {plan ? `${plan.name} — ${formatUsd(plan.amountMinor)}/month` : '—'}
              </dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt className="ws-caption ws-muted">Status</dt>
              <dd style={{ margin: 0 }}>{sub?.status ?? '—'}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt className="ws-caption ws-muted">Paid until</dt>
              <dd className="ws-num" style={{ margin: 0 }}>{formatDate(sub?.currentPeriodEnd)}</dd>
            </div>
            {sub?.graceEndsAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt className="ws-caption ws-muted">Grace ends</dt>
                <dd className="ws-num" style={{ margin: 0 }}>{formatDate(sub.graceEndsAt)}</dd>
              </div>
            )}
          </dl>

          <p className="ws-caption ws-muted">
            One subscription covers your mall and every substore in it. Charged
            from your WorldStreet dollar wallet.
          </p>

          <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
            {needsPayment && (
              <button className="ws-btn ws-btn--primary" onClick={handleCharge} disabled={charging}>
                {charging ? 'Charging…' : plan ? `Pay ${formatUsd(plan.amountMinor)} & Activate` : 'Activate'}
              </button>
            )}
            {sub?.autoRenew && sub.status !== 'CANCELLED' && (
              <button className="ws-btn ws-btn--ghost" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Stopping…' : 'Stop auto-renewal'}
              </button>
            )}
          </div>
        </section>

        {/* Substores */}
        <section className="ws-card ws-stack--md">
          <h2 className="ws-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
            <Store size={18} aria-hidden /> Substores
          </h2>

          <p className="ws-stat__value ws-num" style={{ margin: 0 }}>
            {mall.substoreCount ?? 0}
            {plan?.substoreLimit != null && (
              <span className="ws-caption ws-muted" style={{ fontWeight: 400 }}> / {plan.substoreLimit}</span>
            )}
          </p>

          <p className="ws-caption ws-muted">
            Each substore has its own page, catalogue, reviews and messages —
            all covered by the mall subscription.
          </p>

          <div>
            <Link to="/mall/substores" className="ws-btn ws-btn--sm ws-btn--secondary">
              Manage substores
            </Link>
          </div>
        </section>

        {/* Featured */}
        <section className="ws-card ws-stack--md">
          <h2 className="ws-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
            <CheckCircle2 size={18} aria-hidden /> Featured products
          </h2>

          <p className="ws-stat__value ws-num" style={{ margin: 0 }}>
            {mall.featuredListingIds?.length ?? 0}
            <span className="ws-caption ws-muted" style={{ fontWeight: 400 }}> / 12</span>
          </p>

          <p className="ws-caption ws-muted">
            Hand-picked listings from your substores, shown at the top of your
            mall page.
          </p>

          <div>
            <Link to="/mall/featured" className="ws-btn ws-btn--sm ws-btn--secondary">
              Choose featured
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
