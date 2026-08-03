import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Info, Eye, EyeOff, Wallet, CalendarCheck,
  Package, MessageCircle, MailOpen, Star, Store, ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { storeService, type VendorDashboard, type DashboardAlert } from '@/services/storeService';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Vendor dashboard for the marketplace model.
 *
 * The old version answered "how much did I sell". Nothing is sold on the
 * platform any more, so this answers the two questions that replaced it:
 * is my store visible and until when, and is the subscription earning its
 * keep. Everything comes from one call — GET /stores/me/dashboard.
 */

/** Subscription prices are USD; listing prices stay in naira. */
const formatUsd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const formatResponseTime = (mins: number | null) => {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / (60 * 24))}d`;
};

const errMessage = (err: unknown, fallback: string) => {
  const e = toApiError(err, fallback);
  const fieldError = e.errors && Object.values(e.errors)[0];
  return fieldError || e.message;
};

const errStatus = (err: unknown) => toApiError(err, '').statusCode;

const ALERT: Record<DashboardAlert['severity'], { cls: string; Icon: LucideIcon }> = {
  critical: { cls: '', Icon: AlertCircle },
  warning: { cls: 'ws-alert--warning', Icon: AlertTriangle },
  info: { cls: 'ws-alert--info', Icon: Info },
};

/** Plain-language store state — "DRAFT" means nothing to a vendor. */
function visibilityLabel(d: VendorDashboard): { text: string; tone: 'good' | 'bad' } {
  if (d.store.publiclyVisible) return { text: 'Visible to buyers', tone: 'good' };
  if (d.store.status === 'SUSPENDED' || d.store.status === 'BANNED') {
    return { text: 'Hidden by WorldStreet', tone: 'bad' };
  }
  if (d.subscription?.status === 'LAPSED') return { text: 'Hidden — subscription lapsed', tone: 'bad' };
  return { text: 'Not visible yet', tone: 'bad' };
}

export default function VendorDashboard() {
  const [data, setData] = useState<VendorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getDashboard();
      setData(res.data);
    } catch (err: unknown) {
      const msg = errMessage(err, 'Failed to load dashboard');
      setError(msg);
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Activating charges the vendor's real wallet, so the amount is stated and
   * confirmed before the request goes out. A 402 is an expected outcome, not
   * an error — it means "top up", and it is worded that way.
   */
  const handleActivate = async () => {
    if (!data?.subscription) return;
    const wallet = data.wallet;
    // Credit is spent first, so the wallet is only charged the remainder.
    const price = formatUsd(wallet?.dueMinor ?? data.subscription.plan.amountMinor);

    // The server would answer 402 anyway; refusing here saves a round trip and
    // says the useful thing — how much is missing.
    if (wallet && !wallet.sufficient) {
      addToast({
        type: 'error',
        message: `Your wallet has ${formatUsd(wallet.availableMinor)} but ${price} is due. Top up ${formatUsd(wallet.dueMinor - wallet.availableMinor)} and try again.`,
      });
      return;
    }

    const balanceNote = wallet ? ` Your balance is ${formatUsd(wallet.availableMinor)}.` : '';

    if (!window.confirm(`Charge ${price} from your WorldStreet dollar wallet to keep your store visible for the next month?${balanceNote}`)) {
      return;
    }

    setCharging(true);
    try {
      const res = await storeService.chargeSubscription();
      addToast({
        type: 'success',
        message: res.data.alreadyPaid
          ? 'This period is already paid for.'
          : 'Your store is now visible to buyers.',
      });
      await load();
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          errStatus(err) === 402
            ? 'Not enough balance in your dollar wallet. Top up and try again.'
            : errMessage(err, 'Could not complete the payment'),
      });
    } finally {
      setCharging(false);
    }
  };

  if (loading) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Dashboard</h1></div>
        <div className="ws-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ws-card ws-stack">
              <div className="ws-skeleton" style={{ height: 12, width: '60%' }} />
              <div className="ws-skeleton" style={{ height: 28, width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ws-page">
        <div className="ws-page__head"><h1 className="ws-page__title">Dashboard</h1></div>
        <div className="ws-empty">
          <div className="ws-empty__icon" style={{ color: 'var(--ws-status-danger)' }}>
            <AlertCircle size={26} aria-hidden />
          </div>
          <h2 className="ws-title">Could not load your dashboard</h2>
          <p className="ws-caption ws-muted" style={{ maxWidth: '40ch' }}>{error}</p>
          <button onClick={load} className="ws-btn ws-btn--sm ws-btn--primary">Retry</button>
        </div>
      </div>
    );
  }

  const visibility = visibilityLabel(data);
  const sub = data.subscription;
  const wallet = data.wallet;
  const needsPayment =
    sub != null && ['PENDING_PAYMENT', 'GRACE', 'LAPSED'].includes(sub.status);
  /** What the wallet is charged — credit covers the rest. */
  const dueMinor = wallet?.dueMinor ?? sub?.plan.amountMinor ?? 0;

  const VisibilityIcon = visibility.tone === 'good' ? Eye : EyeOff;

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <h1 className="ws-page__title">Dashboard</h1>
        <span
          className="ws-badge"
          style={{
            background: visibility.tone === 'good' ? 'var(--ws-money-credit-chip)' : 'var(--ws-money-debit-chip)',
            color: visibility.tone === 'good' ? 'var(--ws-status-success)' : 'var(--ws-status-danger)',
          }}
        >
          <VisibilityIcon size={12} aria-hidden />
          {visibility.text}
        </span>
      </div>

      <div className="ws-stack--lg">
        {/* Whatever needs doing, most urgent first. */}
        {data.alerts.length > 0 && (
          <div className="ws-stack">
            {data.alerts.map((alert) => {
              const { cls, Icon } = ALERT[alert.severity];
              return (
                <div key={alert.type} className={`ws-alert ${cls}`.trim()}>
                  <Icon size={16} aria-hidden />
                  <span style={{ flex: 1 }}>{alert.message}</span>
                  {needsPayment && ['ACTIVATE', 'PAYMENT_FAILED', 'EXPIRED'].includes(alert.type) && (
                    <button
                      onClick={handleActivate}
                      disabled={charging}
                      className="ws-btn ws-btn--sm ws-btn--primary"
                    >
                      {charging ? 'Processing…' : `Pay ${formatUsd(dueMinor)}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* The wallet the subscription is charged against. Shown always, not
            just when payment is due: "can I afford the renewal" is a question
            vendors ask before the alert appears. Just the number — what to do
            about it is the alert's job. */}
        <div className="ws-card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
          <span className="ws-iconchip">
            <Wallet size={22} aria-hidden />
          </span>
          <div>
            <span className="ws-label">WorldStreet dollar wallet</span>
            <div className="ws-stat__value">
              {wallet ? formatUsd(wallet.availableMinor) : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* The four numbers that matter now. */}
        <div className="ws-stats">
          <div className="ws-stat">
            <span className="ws-stat__label"><CalendarCheck size={12} aria-hidden /> Days Remaining</span>
            <span className="ws-stat__value">
              {sub?.daysRemaining != null && sub.daysRemaining > 0 ? sub.daysRemaining : '—'}
            </span>
            <span className="ws-stat__delta ws-muted">
              {sub?.currentPeriodEnd ? `Renews ${formatDate(sub.currentPeriodEnd)}` : 'Not active'}
            </span>
          </div>

          <div className="ws-stat">
            <span className="ws-stat__label"><Package size={12} aria-hidden /> Live Listings</span>
            <span className="ws-stat__value">{data.listings.published}</span>
            <span className="ws-stat__delta ws-muted">
              {data.listings.draft > 0 ? `${data.listings.draft} in draft` : 'All published'}
            </span>
          </div>

          <div className="ws-stat">
            <span className="ws-stat__label"><MessageCircle size={12} aria-hidden /> Inquiries This Period</span>
            <span className="ws-stat__value">{data.engagement.inquiriesThisPeriod}</span>
            <span className="ws-stat__delta ws-muted">since {formatDate(data.engagement.since)}</span>
          </div>

          <Link to="/vendor/messages" className="ws-stat ws-plink">
            <span className="ws-stat__label"><MailOpen size={12} aria-hidden /> Unread Messages</span>
            <span className="ws-stat__value">{data.inbox.unread}</span>
            <span className="ws-stat__delta ws-muted">
              {data.inbox.openThreads} open conversation{data.inbox.openThreads === 1 ? '' : 's'}
            </span>
          </Link>
        </div>

        {/* What buyers see about this seller. */}
        <section>
          <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>How buyers see you</h2>
          <div className="ws-stats">
            <div className="ws-stat">
              <span className="ws-stat__label">Response Rate</span>
              <span className="ws-stat__value">
                {data.engagement.responseRate != null ? `${Math.round(data.engagement.responseRate * 100)}%` : '—'}
              </span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">Avg. Reply Time</span>
              <span className="ws-stat__value">{formatResponseTime(data.engagement.avgResponseMins)}</span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">Rating</span>
              <span className="ws-stat__value">
                {data.reputation.reviewCount > 0 ? data.reputation.avgRating.toFixed(1) : '—'}
                {data.reputation.reviewCount > 0 && (
                  <Star size={16} aria-hidden style={{ color: 'var(--ws-accent-star, #F97316)', fill: 'var(--ws-accent-star, #F97316)', marginLeft: 4 }} />
                )}
              </span>
              <span className="ws-stat__delta ws-muted">
                {data.reputation.reviewCount} review{data.reputation.reviewCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">Listing Views</span>
              <span className="ws-stat__value">{data.engagement.views}</span>
            </div>
          </div>
        </section>

        {/* Subscription detail. Credit is spent before the wallet, so it is
            only shown when there is some — otherwise it is noise. */}
        {sub && (
          <section>
            <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Subscription</h2>
            <div className="ws-card ws-card--flush ws-table-wrap">
              <table className="ws-table">
                <tbody>
                  <tr>
                    <td>Plan</td>
                    <td><strong>{sub.plan.name}</strong> — {formatUsd(sub.plan.amountMinor)}/month</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>{sub.status.replace(/_/g, ' ').toLowerCase()}</td>
                  </tr>
                  <tr>
                    <td>Current period</td>
                    <td>{formatDate(sub.currentPeriodStart)} — {formatDate(sub.currentPeriodEnd)}</td>
                  </tr>
                  <tr>
                    <td>Auto-renew</td>
                    <td>{sub.autoRenew ? 'On' : 'Off'}</td>
                  </tr>
                  {sub.creditMinor > 0 && (
                    <tr>
                      <td>Store credit</td>
                      <td>{formatUsd(sub.creditMinor)} — used before your wallet is charged</td>
                    </tr>
                  )}
                  <tr>
                    <td>Wallet balance</td>
                    <td>{wallet ? formatUsd(wallet.availableMinor) : 'Unavailable right now'}</td>
                  </tr>
                  {sub.lastCharge && (
                    <tr>
                      <td>Last payment</td>
                      <td>
                        {sub.lastCharge.status === 'PAID'
                          ? `${formatUsd(sub.lastCharge.amountMinor)} on ${formatDate(sub.lastCharge.chargedAt)}`
                          : `Failed${sub.lastCharge.failureCode ? ` (${sub.lastCharge.failureCode.replace(/_/g, ' ').toLowerCase()})` : ''}`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Quick Links</h2>
          <div className="ws-stats">
            <Link to="/vendor/products" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <Package size={18} aria-hidden />
              <span className="ws-title">Manage Listings</span>
            </Link>
            <Link to="/vendor/messages" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <MessageCircle size={18} aria-hidden />
              <span className="ws-title">Messages</span>
            </Link>
            <Link to="/vendor/reviews?unreplied=1" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <Star size={18} aria-hidden />
              <span className="ws-title">Reviews</span>
            </Link>
            <Link to="/vendor/settings" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <Store size={18} aria-hidden />
              <span className="ws-title">Store Profile</span>
            </Link>
            {data.store.publiclyVisible && (
              <Link to={`/stores/${data.store.slug}`} className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
                <ExternalLink size={18} aria-hidden />
                <span className="ws-title">View Public Store</span>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
