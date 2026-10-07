import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Building2, CheckCircle2, CreditCard, ExternalLink, Store,
} from 'lucide-react';
import { mallService, type MyMall } from '@/features/malls/api';
import { toApiError } from '@/shared/lib/api';
import { useUIStore } from '@/shared/store/uiStore';
import { billingInterval } from '@/features/stores/model';
import { useLocalMoney } from '@/shared/hooks/useLocalMoney';

/**
 * Mall owner dashboard: the subscription that keeps the whole mall (and every
 * substore in it) visible, plus a substore overview. One monthly
 * subscription is the only bill — substores never charge separately, which is
 * the value proposition and worth restating where the money is managed.
 */

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
  // Subscription amounts in the mall's own currency, with the USD charged.
  const { money, short, converted } = useLocalMoney(mall?.country);
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

  /**
   * Charges the owner's real wallet, so, like the store dashboard, the amount
   * is stated and confirmed first, and a short balance is caught before the
   * request rather than reported after it fails.
   */
  const handleCharge = async () => {
    const plan = mall?.subscription?.plan;
    if (!plan) return;
    const price = money(plan.amountMinor);
    const wallet = mall?.wallet;

    if (wallet && wallet.availableMinor < plan.amountMinor) {
      addToast({
        type: 'error',
        message: `Your wallet has ${money(wallet.availableMinor)} but ${price} is due. Top up ${money(plan.amountMinor - wallet.availableMinor)} and try again.`,
      });
      return;
    }

    const balanceNote = wallet ? ` Your balance is ${money(wallet.availableMinor)}.` : '';
    if (!window.confirm(`Charge ${price} from your WorldStreet dollar wallet to keep your mall and every store in it visible for one billing period (${plan.name}, ${price} ${billingInterval(plan)})?${balanceNote}`)) {
      return;
    }

    setCharging(true);
    try {
      const res = await mallService.chargeSubscription();
      addToast({
        type: 'success',
        message: res.data.alreadyPaid
          ? 'This period is already paid for.'
          : 'Subscription active — your mall and its stores are now visible.',
      });
      await load();
    } catch (err: unknown) {
      const e = toApiError(err, 'Could not complete the charge');
      addToast({
        type: 'error',
        message: e.statusCode === 402 ? 'Not enough balance in your dollar wallet. Top up and try again.' : e.message,
      });
    } finally {
      setCharging(false);
    }
  };

  /** Undoes a cancellation inside the paid period. Nothing is charged now. */
  const handleResume = async () => {
    setCancelling(true);
    try {
      await mallService.resumeSubscription();
      addToast({ type: 'success', message: 'Auto-renewal is back on', description: 'Nothing is charged until your current period ends.' });
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not turn auto-renewal back on').message });
    } finally {
      setCancelling(false);
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
  // GRACE genuinely needs payment to stay up. PENDING_PAYMENT only warrants a
  // warning while the mall is actually hidden by it.
  const needsPayment =
    !mall.isPubliclyVisible || sub?.status === 'GRACE';
  // Cancelled but still inside the paid period: turning renewal back on is
  // free. Once the period is over, needsPayment covers the way back.
  const canResume = sub?.status === 'CANCELLED' && mall.isPubliclyVisible;

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
              ? 'Your mall is not visible to buyers yet. Activate the subscription to go live — every store goes live with it.'
              : 'Your subscription needs payment to keep the mall and its stores visible.'}
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
                {plan ? `${plan.name}, ${money(plan.amountMinor)} ${billingInterval(plan)}` : '—'}
              </dd>
            </div>
            {converted && (
              <p className="ws-caption ws-muted" style={{ margin: 0 }}>
                Charged in US dollars from your WorldStreet dollar wallet. Local amounts use today's rate.
              </p>
            )}
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
            One subscription covers your mall and every store in it. Charged
            from your WorldStreet dollar wallet.
          </p>

          <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
            {needsPayment && (
              <button className="ws-btn ws-btn--primary" onClick={handleCharge} disabled={charging}>
                {charging ? 'Charging…' : plan ? `Pay ${short(plan.amountMinor)} & Activate` : 'Activate'}
              </button>
            )}
            {sub?.autoRenew && sub.status !== 'CANCELLED' && (
              <button className="ws-btn ws-btn--ghost" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Stopping…' : 'Stop auto-renewal'}
              </button>
            )}
            {canResume && (
              <button className="ws-btn ws-btn--secondary" onClick={handleResume} disabled={cancelling}>
                {cancelling ? 'Saving…' : 'Turn auto-renew back on'}
              </button>
            )}
          </div>
        </section>

        {/* Stores */}
        <section className="ws-card ws-stack--md">
          <h2 className="ws-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-2)' }}>
            <Store size={18} aria-hidden /> Stores
          </h2>

          <p className="ws-stat__value ws-num" style={{ margin: 0 }}>
            {mall.substoreCount ?? 0}
            {plan?.substoreLimit != null && (
              <span className="ws-caption ws-muted" style={{ fontWeight: 400 }}> / {plan.substoreLimit}</span>
            )}
          </p>

          <p className="ws-caption ws-muted">
            Each store has its own page, catalogue, reviews and messages —
            all covered by the mall subscription.
          </p>

          <div>
            <Link to="/mall/stores" className="ws-btn ws-btn--sm ws-btn--secondary">
              Manage stores
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
            Hand-picked listings from your stores, shown at the top of your
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
