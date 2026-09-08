import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, FolderTree, Users, Store } from 'lucide-react';
import {
  adminReportService,
  ACTIONS_BY_TARGET,
  type AdminReportStats,
  type AdminQueueEntry,
  type ReportAdminAction,
} from '@/services/reportService';
import { useUIStore } from '@/store/uiStore';
import { toApiError } from '@/services/api';

/**
 * Admin dashboard.
 *
 * The old one led with Total Orders and Total Revenue — numbers from a model
 * where the platform sat inside every sale. Nothing is transacted on the
 * platform now, so the admin's actual job is moderation: what has been
 * reported, and what needs a decision. The report queue is that work, and this
 * page is its front door.
 */

export default function AdminDashboard() {
  const addToast = useUIStore((s) => s.addToast);
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [queue, setQueue] = useState<AdminQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The queue key of the row whose request is in flight, so one slow action
  // does not lock every row's buttons.
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([
        adminReportService.stats(),
        adminReportService.queue(),
      ]);
      setStats(statsRes.data);
      setQueue(queueRes.data);
      setError(null);
    } catch {
      setError('Could not load moderation stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const decide = async (
    entry: AdminQueueEntry,
    decision: { kind: 'action'; action: ReportAdminAction; label: string } | { kind: 'dismiss' },
  ) => {
    const verb = decision.kind === 'dismiss' ? 'Dismiss all reports on' : `${decision.label} —`;
    if (!confirm(`${verb} "${entry.label}"?`)) return;

    const key = `${entry.targetType}:${entry.targetId}`;
    setActing(key);
    try {
      // Any one report id will do — the server closes every open report on
      // the target.
      const reportId = entry.reportIds[0];
      if (decision.kind === 'dismiss') {
        await adminReportService.dismiss(reportId);
        addToast({ type: 'success', message: `Dismissed all reports on "${entry.label}".` });
      } else {
        await adminReportService.action(reportId, decision.action);
        addToast({ type: 'success', message: `${decision.label} applied to "${entry.label}".` });
      }
      await load();
    } catch (err: unknown) {
      addToast({ type: 'error', message: toApiError(err, 'Could not apply that decision').message });
    } finally {
      setActing(null);
    }
  };

  const open = stats?.byStatus.OPEN ?? 0;
  const reviewing = stats?.byStatus.REVIEWING ?? 0;

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div>
          <h1 className="ws-page__title">Admin</h1>
          <p className="ws-page__sub">
            Moderation is the job now: nothing is transacted on the platform, so
            de-listing is the only enforcement lever.
          </p>
        </div>
      </div>

      <div className="ws-stack--lg">
        {loading ? (
          <div className="ws-stats">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ws-skeleton" style={{ height: 96, borderRadius: 'var(--ws-radius-xl)' }} />
            ))}
          </div>
        ) : error ? (
          <div className="ws-alert" role="alert">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        ) : stats && (
          <>
            <div className="ws-stats">
              <div className="ws-stat">
                <span className="ws-stat__label">Open Reports</span>
                <span
                  className="ws-stat__value"
                  style={open > 0 ? { color: 'var(--ws-status-danger)' } : undefined}
                >
                  {open}
                </span>
              </div>
              <div className="ws-stat">
                <span className="ws-stat__label">Reported Targets</span>
                <span className="ws-stat__value">{stats.openTargets}</span>
              </div>
              <div className="ws-stat">
                <span className="ws-stat__label">Being Reviewed</span>
                <span className="ws-stat__value">{reviewing}</span>
              </div>
              <div className="ws-stat">
                <span className="ws-stat__label">Resolved</span>
                <span className="ws-stat__value">
                  {(stats.byStatus.ACTIONED ?? 0) + (stats.byStatus.DISMISSED ?? 0)}
                </span>
              </div>
            </div>

            {queue.length > 0 ? (
              <section>
                <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Moderation queue</h2>
                <div className="ws-card ws-card--flush ws-table-wrap">
                  <table className="ws-table">
                    <thead>
                      <tr>
                        <th>Target</th>
                        <th>Type</th>
                        <th>Reasons</th>
                        <th className="ws-table__num">Reports</th>
                        <th>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((entry) => {
                        const key = `${entry.targetType}:${entry.targetId}`;
                        const busy = acting !== null;
                        // A since-deleted target has nothing left to action.
                        const gone = entry.targetStatus === 'GONE';
                        return (
                          <tr key={key}>
                            <td>
                              {entry.label}
                              <span className="ws-caption ws-subtle" style={{ display: 'block' }}>
                                {entry.targetStatus.toLowerCase()}
                              </span>
                            </td>
                            <td className="ws-muted">{entry.targetType.toLowerCase()}</td>
                            <td className="ws-muted">{entry.reasons.map((r) => r.toLowerCase()).join(', ')}</td>
                            <td className="ws-table__num"><strong>{entry.reportCount}</strong></td>
                            <td>
                              <div style={{ display: 'flex', gap: 'var(--ws-space-2)', flexWrap: 'wrap' }}>
                                {!gone && ACTIONS_BY_TARGET[entry.targetType].map((a) => (
                                  <button
                                    key={a.value}
                                    className="ws-btn ws-btn--sm ws-btn--secondary"
                                    disabled={busy}
                                    onClick={() => decide(entry, { kind: 'action', action: a.value, label: a.label })}
                                  >
                                    {acting === key ? '…' : a.label}
                                  </button>
                                ))}
                                <button
                                  className="ws-btn ws-btn--sm ws-btn--ghost"
                                  disabled={busy}
                                  onClick={() => decide(entry, { kind: 'dismiss' })}
                                >
                                  Dismiss
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="ws-caption ws-subtle" style={{ marginTop: 'var(--ws-space-2)' }}>
                  A decision closes every open report on that target. Suspending
                  or banning a store or mall also hides its published listings.
                </p>
              </section>
            ) : (
              <p className="ws-body ws-muted">Nothing in the moderation queue. Quiet is good.</p>
            )}
          </>
        )}

        <section>
          <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Manage</h2>
          <div className="ws-stats">
            <Link to="/admin/categories" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <FolderTree size={18} aria-hidden />
              <span className="ws-title">Categories &amp; Attributes</span>
            </Link>
            <Link to="/admin/users" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <Users size={18} aria-hidden />
              <span className="ws-title">Users &amp; Roles</span>
            </Link>
            <Link to="/listings" className="ws-card ws-plink" style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
              <Store size={18} aria-hidden />
              <span className="ws-title">View Marketplace</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
