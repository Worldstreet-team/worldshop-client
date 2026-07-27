import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

const ALERT_ICON: Record<DashboardAlert['severity'], string> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
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
      <div className="vendor-dashboard">
        <div className="dashboard-header"><h1>Dashboard</h1></div>
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card skeleton">
              <div className="skeleton-row" style={{ height: 20, width: '60%' }} />
              <div className="skeleton-row" style={{ height: 32, width: '40%', marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="vendor-dashboard">
        <div className="dashboard-header"><h1>Dashboard</h1></div>
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#666' }}>
          <span className="material-icons" style={{ fontSize: '3rem', color: '#dc3545', display: 'block', marginBottom: '1rem' }}>
            error_outline
          </span>
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <button onClick={load} style={{ padding: '0.5rem 1.5rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Retry
          </button>
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

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <span style={{ fontSize: '0.95rem', color: visibility.tone === 'good' ? '#1a7f37' : '#b42318', fontWeight: 600 }}>
          <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'text-bottom', marginRight: 4 }}>
            {visibility.tone === 'good' ? 'visibility' : 'visibility_off'}
          </span>
          {visibility.text}
        </span>
      </div>

      {/* Whatever needs doing, most urgent first. */}
      {data.alerts.length > 0 && (
        <div className="dashboard-alerts" style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {data.alerts.map((alert) => (
            <div
              key={alert.type}
              className={`dashboard-info-bar alert-${alert.severity}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: alert.severity === 'critical' ? '#fef3f2' : alert.severity === 'warning' ? '#fffaeb' : '#f8f9fa',
                border: `1px solid ${alert.severity === 'critical' ? '#fda29b' : alert.severity === 'warning' ? '#fec84b' : '#e4e7ec'}`,
                color: alert.severity === 'critical' ? '#b42318' : alert.severity === 'warning' ? '#b54708' : '#475467',
              }}
            >
              <span className="material-icons" style={{ fontSize: '1.2rem' }}>{ALERT_ICON[alert.severity]}</span>
              <span style={{ flex: 1 }}>{alert.message}</span>
              {needsPayment && (alert.type === 'ACTIVATE' || alert.type === 'PAYMENT_FAILED' || alert.type === 'EXPIRED') && (
                <button
                  onClick={handleActivate}
                  disabled={charging}
                  style={{
                    padding: '0.4rem 1rem', background: '#b42318', color: 'white',
                    border: 'none', borderRadius: 6, cursor: charging ? 'wait' : 'pointer', fontWeight: 600,
                  }}
                >
                  {charging ? 'Processing…' : `Pay ${formatUsd(dueMinor)}`}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* The wallet the subscription is charged against. Shown always, not just
          when payment is due: "can I afford the renewal" is a question vendors
          ask before the alert appears. Just the number — what to do about it is
          the alert's job. */}
      <div
        className="dashboard-wallet"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem', marginBottom: '1.25rem', borderRadius: 8,
          background: '#ffffff', border: '1px solid #e4e7ec',
        }}
      >
        <span className="material-icons" style={{ color: '#667085' }}>account_balance_wallet</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8rem', color: '#667085' }}>WorldStreet dollar wallet</span>
          <strong style={{ fontSize: '1.25rem', color: '#101828' }}>
            {wallet ? formatUsd(wallet.availableMinor) : 'Unavailable'}
          </strong>
        </div>
      </div>

      {/* The four numbers that matter now. */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><span className="material-icons">event_available</span></div>
          <div className="stat-content">
            <span className="stat-label">Days Remaining</span>
            <span className="stat-value">{sub?.daysRemaining != null && sub.daysRemaining > 0 ? sub.daysRemaining : '—'}</span>
            <span className="stat-sub" style={{ fontSize: '0.8rem', color: '#667085' }}>
              {sub?.currentPeriodEnd ? `Renews ${formatDate(sub.currentPeriodEnd)}` : 'Not active'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><span className="material-icons">inventory_2</span></div>
          <div className="stat-content">
            <span className="stat-label">Live Listings</span>
            <span className="stat-value">{data.listings.published}</span>
            <span className="stat-sub" style={{ fontSize: '0.8rem', color: '#667085' }}>
              {data.listings.draft > 0 ? `${data.listings.draft} in draft` : 'All published'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon"><span className="material-icons">forum</span></div>
          <div className="stat-content">
            <span className="stat-label">Inquiries This Period</span>
            <span className="stat-value">{data.engagement.inquiriesThisPeriod}</span>
            <span className="stat-sub" style={{ fontSize: '0.8rem', color: '#667085' }}>
              since {formatDate(data.engagement.since)}
            </span>
          </div>
        </div>

        <Link to="/vendor/messages" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-icon"><span className="material-icons">mark_email_unread</span></div>
          <div className="stat-content">
            <span className="stat-label">Unread Messages</span>
            <span className="stat-value">{data.inbox.unread}</span>
            <span className="stat-sub" style={{ fontSize: '0.8rem', color: '#667085' }}>
              {data.inbox.openThreads} open conversation{data.inbox.openThreads === 1 ? '' : 's'}
            </span>
          </div>
        </Link>
      </div>

      {/* What buyers see about this seller. */}
      <section className="dashboard-section">
        <h2>How buyers see you</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Response Rate</span>
              <span className="stat-value">
                {data.engagement.responseRate != null ? `${Math.round(data.engagement.responseRate * 100)}%` : '—'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Avg. Reply Time</span>
              <span className="stat-value">{formatResponseTime(data.engagement.avgResponseMins)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Rating</span>
              <span className="stat-value">
                {data.reputation.reviewCount > 0 ? `${data.reputation.avgRating.toFixed(1)} ★` : '—'}
              </span>
              <span className="stat-sub" style={{ fontSize: '0.8rem', color: '#667085' }}>
                {data.reputation.reviewCount} review{data.reputation.reviewCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Listing Views</span>
              <span className="stat-value">{data.engagement.views}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription detail. Credit is spent before the wallet, so it is only
          shown when there is some — otherwise it is noise. */}
      {sub && (
        <section className="dashboard-section">
          <h2>Subscription</h2>
          <div className="data-table-container">
            <table className="data-table">
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

      <section className="dashboard-section">
        <h2>Quick Links</h2>
        <div className="quick-links-grid">
          <Link to="/vendor/products" className="quick-link-card">
            <span className="material-icons">inventory_2</span>
            <span>Manage Listings</span>
          </Link>
          <Link to="/vendor/messages" className="quick-link-card">
            <span className="material-icons">forum</span>
            <span>Messages</span>
          </Link>
          <Link to="/vendor/reviews?unreplied=1" className="quick-link-card">
            <span className="material-icons">star_rate</span>
            <span>Reviews</span>
          </Link>
          <Link to="/vendor/settings" className="quick-link-card">
            <span className="material-icons">storefront</span>
            <span>Store Profile</span>
          </Link>
          {data.store.publiclyVisible && (
            <Link to={`/stores/${data.store.slug}`} className="quick-link-card">
              <span className="material-icons">open_in_new</span>
              <span>View Public Store</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
