import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, FolderTree, Users, Store } from 'lucide-react';
import { adminReportService, type AdminReportStats } from '@/services/reportService';

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
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminReportService
      .stats()
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load moderation stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

            {stats.mostReported.length > 0 ? (
              <section>
                <h2 className="ws-h2" style={{ marginBottom: 'var(--ws-space-4)' }}>Most reported</h2>
                <div className="ws-card ws-card--flush ws-table-wrap">
                  <table className="ws-table">
                    <thead>
                      <tr>
                        <th>Target</th>
                        <th>Type</th>
                        <th className="ws-table__num">Reports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.mostReported.map((t) => (
                        <tr key={`${t.targetType}:${t.targetId}`}>
                          <td>{t.label}</td>
                          <td className="ws-muted">{t.targetType.toLowerCase()}</td>
                          <td className="ws-table__num"><strong>{t.reportCount}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* The full queue (claim / dismiss / action) has API support but
                    no page yet — these counts come from the same endpoints. */}
                <p className="ws-caption ws-subtle" style={{ marginTop: 'var(--ws-space-2)' }}>
                  Acting on reports is currently done via the moderation API; a
                  full queue screen is the next admin build.
                </p>
              </section>
            ) : open === 0 ? (
              <p className="ws-body ws-muted">Nothing in the moderation queue. Quiet is good.</p>
            ) : null}
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
