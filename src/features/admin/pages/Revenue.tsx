import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { adminBillingService, usd, type AdminRevenue, type RevenueMonth } from '@/features/admin/billing';
import { toApiError } from '@/shared/lib/api';

/**
 * What vendor subscriptions bring in. Every figure is read off the charge
 * records the server keeps for each billing period, stores and malls both.
 */

const RANGES = [6, 12, 24] as const;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  GRACE: 'In grace',
  PENDING_PAYMENT: 'Awaiting first payment',
  LAPSED: 'Lapsed',
  CANCELLED: 'Cancelled',
};
const STATUS_ORDER = ['ACTIVE', 'GRACE', 'PENDING_PAYMENT', 'CANCELLED', 'LAPSED'];

const FAILURE_LABEL: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  UNREACHABLE: 'Wallet unreachable',
  NOT_CONFIGURED: 'Wallet not configured',
  OTHER: 'Wallet error',
};

function monthLabel(key: string, style: 'short' | 'long' = 'short'): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  });
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

/** "+12% on last month", or nothing when there is no last month to compare. */
function delta(now: number, before: number): { text: string; cls: string } | null {
  if (before === 0) return now > 0 ? { text: 'First revenue this month', cls: 'is-up' } : null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return { text: 'Same as last month', cls: '' };
  return { text: `${pct > 0 ? '+' : ''}${pct}% on last month`, cls: pct > 0 ? 'is-up' : 'is-down' };
}

function RevenueChart({ series }: { series: RevenueMonth[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.map((r) => r.storeMinor + r.mallMinor), 0);
  // Round the top of the scale up to a clean figure so the gridlines land on
  // readable amounts.
  const step = max <= 0 ? 1 : 10 ** Math.floor(Math.log10(max));
  const top = max <= 0 ? 10000 : Math.ceil(max / step) * step;
  const ticks = [top, top / 2, 0];

  return (
    <div className="ws-revchart" onMouseLeave={() => setHover(null)}>
      <div className="ws-revchart__axis" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="ws-num">{usd(t)}</span>
        ))}
      </div>
      <div className="ws-revchart__plot" role="img" aria-label="Revenue per month. The table below has the same figures.">
        {ticks.map((t) => (
          <span key={t} className="ws-revchart__grid" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
        ))}
        {series.map((row, i) => {
          const total = row.storeMinor + row.mallMinor;
          return (
            <div
              key={row.month}
              className={`ws-revchart__col${hover === i ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${monthLabel(row.month, 'long')}: ${usd(total)} from ${row.payments} payment(s)`}
            >
              <span className="ws-revchart__bar" style={{ height: total ? `max(${(total / top) * 100}%, 3px)` : 0 }} />
              <span className="ws-revchart__label">{monthLabel(row.month)}</span>
              {hover === i && (
                <span className={`ws-revchart__tip${i > series.length / 2 ? ' is-left' : ''}`} role="tooltip">
                  <strong>{monthLabel(row.month, 'long')}</strong>
                  <span className="ws-num">{usd(total)} · {row.payments} payment{row.payments === 1 ? '' : 's'}</span>
                  <span className="ws-num">Stores {usd(row.storeMinor)} · Malls {usd(row.mallMinor)}</span>
                  {row.creditMinor > 0 && <span className="ws-num">{usd(row.creditMinor)} paid from store credit</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminRevenue() {
  const [months, setMonths] = useState<(typeof RANGES)[number]>(12);
  // The previous range stays on screen, dimmed, while the next one loads.
  const query = useQuery({
    queryKey: ['admin', 'revenue', months],
    queryFn: () => adminBillingService.getRevenue(months),
    placeholderData: keepPreviousData,
  });
  const data: AdminRevenue | undefined = query.data;
  const loading = query.isFetching;
  const error = query.error ? toApiError(query.error, 'Could not load revenue').message : null;

  const change = useMemo(
    () => (data ? delta(data.totals.thisMonthMinor, data.totals.lastMonthMinor) : null),
    [data],
  );

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <h1 className="ws-page__title">Revenue</h1>
        <div className="ws-segmented" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`ws-segmented__btn${months === r ? ' is-active' : ''}`}
              aria-pressed={months === r}
              onClick={() => setMonths(r)}
            >
              {r} months
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="ws-alert" role="alert">
          <AlertCircle size={16} aria-hidden />
          <span>{error}</span>
        </div>
      ) : loading && !data ? (
        <div className="ws-stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ws-skeleton" style={{ height: 112, borderRadius: 'var(--ws-radius-xl)' }} />
          ))}
        </div>
      ) : data && (
        <div className="ws-stack--lg" style={{ opacity: loading ? 0.6 : 1 }}>
          <div className="ws-stats">
            <div className="ws-stat">
              <span className="ws-stat__label">This month</span>
              <span className="ws-stat__value">{usd(data.totals.thisMonthMinor)}</span>
              {change && <span className={`ws-stat__delta ${change.cls}`}>{change.text}</span>}
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">Monthly recurring</span>
              <span className="ws-stat__value">{usd(data.totals.monthlyRecurringMinor)}</span>
              <span className="ws-stat__delta">From subscriptions set to renew</span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">All time</span>
              <span className="ws-stat__value">{usd(data.totals.allTimeMinor)}</span>
              <span className="ws-stat__delta">
                {data.totals.allTimePayments} payment{data.totals.allTimePayments === 1 ? '' : 's'}
                {data.totals.allTimeCreditMinor > 0 && ` · ${usd(data.totals.allTimeCreditMinor)} from store credit`}
              </span>
            </div>
            <div className="ws-stat">
              <span className="ws-stat__label">Failed payments</span>
              <span
                className="ws-stat__value"
                style={data.totals.failedLast30Days > 0 ? { color: 'var(--ws-status-danger)' } : undefined}
              >
                {data.totals.failedLast30Days}
              </span>
              <span className="ws-stat__delta">Last 30 days</span>
            </div>
          </div>

          <section className="ws-card">
            <div className="ws-sectionhead" style={{ marginBottom: 'var(--ws-space-4)' }}>
              <h2 className="ws-h2">Revenue by month</h2>
            </div>
            <RevenueChart series={data.series} />
            <details className="ws-revtable">
              <summary>Show as a table</summary>
              <div className="ws-table-wrap">
                <table className="ws-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="ws-table__num">Stores</th>
                      <th className="ws-table__num">Malls</th>
                      <th className="ws-table__num">From credit</th>
                      <th className="ws-table__num">Payments</th>
                      <th className="ws-table__num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.series].reverse().map((r) => (
                      <tr key={r.month}>
                        <td>{monthLabel(r.month, 'long')}</td>
                        <td className="ws-table__num">{usd(r.storeMinor)}</td>
                        <td className="ws-table__num">{usd(r.mallMinor)}</td>
                        <td className="ws-table__num">{usd(r.creditMinor)}</td>
                        <td className="ws-table__num">{r.payments}</td>
                        <td className="ws-table__num" style={{ fontWeight: 600 }}>{usd(r.storeMinor + r.mallMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section className="ws-card">
            <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Subscriptions</h2>
            <div className="ws-table-wrap">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th className="ws-table__num">Stores</th>
                    <th className="ws-table__num">Malls</th>
                  </tr>
                </thead>
                <tbody>
                  {STATUS_ORDER.map((s) => (
                    <tr key={s}>
                      <td>{STATUS_LABEL[s]}</td>
                      <td className="ws-table__num">{data.subscriptions.stores[s] ?? 0}</td>
                      <td className="ws-table__num">{data.subscriptions.malls[s] ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Recent payments</h2>
            <div className="ws-card ws-card--flush ws-table-wrap">
              <table className="ws-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Plan</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th className="ws-table__num">Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <p className="ws-body ws-muted" style={{ textAlign: 'center', padding: 'var(--ws-space-6)' }}>
                          No payments yet.
                        </p>
                      </td>
                    </tr>
                  ) : data.recent.map((p) => (
                    <tr key={`${p.kind}-${p.id}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="ws-caption ws-muted">{p.kind === 'MALL' ? 'Mall' : 'Store'}</div>
                      </td>
                      <td>{p.plan}</td>
                      <td className="ws-num">{formatDate(p.periodStart)} to {formatDate(p.periodEnd)}</td>
                      <td>
                        {p.status === 'PAID' ? (
                          <span className="ws-badge ws-badge--success">Paid</span>
                        ) : (
                          <>
                            <span className="ws-badge ws-badge--danger">Failed</span>
                            <div className="ws-caption ws-muted" style={{ marginTop: 2 }}>
                              {FAILURE_LABEL[p.failureCode ?? 'OTHER'] ?? p.failureCode}
                              {p.attempts > 1 && ` · ${p.attempts} attempts`}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="ws-table__num">
                        {usd(p.amountMinor)}
                        {p.status === 'PAID' && p.creditMinor > 0 && (
                          <div className="ws-caption ws-muted">{usd(p.creditMinor)} credit</div>
                        )}
                      </td>
                      <td className="ws-num">{formatDate(p.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
