import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="admin-dashboard">
      <div className="page-header">
        <h1>Admin</h1>
        <p style={{ color: '#667085' }}>
          Moderation is the job now: nothing is transacted on the platform, so
          de-listing is the only enforcement lever.
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#667085' }}>Loading…</p>
      ) : error ? (
        <p style={{ color: '#b42318' }}>{error}</p>
      ) : stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Open Reports</span>
                <span className="stat-value" style={{ color: open > 0 ? '#b42318' : undefined }}>{open}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Reported Targets</span>
                <span className="stat-value">{stats.openTargets}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Being Reviewed</span>
                <span className="stat-value">{reviewing}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">Resolved</span>
                <span className="stat-value">
                  {(stats.byStatus.ACTIONED ?? 0) + (stats.byStatus.DISMISSED ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {stats.mostReported.length > 0 ? (
            <section className="dashboard-section">
              <h2>Most reported</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>Type</th>
                      <th>Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.mostReported.map((t) => (
                      <tr key={`${t.targetType}:${t.targetId}`}>
                        <td>{t.label}</td>
                        <td style={{ color: '#667085' }}>{t.targetType.toLowerCase()}</td>
                        <td><strong>{t.reportCount}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* The full queue (claim / dismiss / action) has API support but
                  no page yet — these counts come from the same endpoints. */}
              <p style={{ color: '#98a2b3', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Acting on reports is currently done via the moderation API; a
                full queue screen is the next admin build.
              </p>
            </section>
          ) : open === 0 ? (
            <p style={{ color: '#667085' }}>Nothing in the moderation queue. Quiet is good.</p>
          ) : null}
        </>
      )}

      <section className="dashboard-section">
        <h2>Manage</h2>
        <div className="quick-links-grid">
          <Link to="/admin/categories" className="quick-link-card">
            <span className="material-icons">category</span>
            <span>Categories & Attributes</span>
          </Link>
          <Link to="/admin/users" className="quick-link-card">
            <span className="material-icons">group</span>
            <span>Users & Roles</span>
          </Link>
          <Link to="/listings" className="quick-link-card">
            <span className="material-icons">storefront</span>
            <span>View Marketplace</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
