import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vendorService, type VendorAnalytics, type VendorBalanceSummary } from '@/services/vendorService';
import { useUIStore } from '@/store/uiStore';

const formatPrice = (price: number) =>
  '₦' + price.toLocaleString('en-NG', { minimumFractionDigits: 0 });

export default function VendorDashboard() {
  const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
  const [balance, setBalance] = useState<VendorBalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, balanceRes] = await Promise.all([
          vendorService.getAnalytics(),
          vendorService.getBalance(),
        ]);
        setAnalytics(analyticsRes.data);
        setBalance(balanceRes.data);
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to load dashboard';
        setError(msg);
        addToast({ type: 'error', message: msg });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  if (loading) {
    return (
      <div className="vendor-dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
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

  if (error) {
    return (
      <div className="vendor-dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
        </div>
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#666',
        }}>
          <span className="material-icons" style={{ fontSize: '3rem', color: '#dc3545', display: 'block', marginBottom: '1rem' }}>error_outline</span>
          <p style={{ marginBottom: '1rem' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = analytics?.summary;

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">shopping_bag</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{summary?.totalOrders ?? 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">payments</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Sales</span>
            <span className="stat-value">{formatPrice(summary?.totalSales ?? 0)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">account_balance</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Net Revenue</span>
            <span className="stat-value">{formatPrice(summary?.netRevenue ?? 0)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">account_balance_wallet</span>
          </div>
          <div className="stat-content">
            <span className="stat-label">Available Balance</span>
            <span className="stat-value">{formatPrice(balance?.availableBalance ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Commission Info */}
      {summary && summary.totalCommission > 0 && (
        <div className="dashboard-info-bar">
          <span className="material-icons">info</span>
          <span>
            Platform commission: {formatPrice(summary.totalCommission)} deducted from {formatPrice(summary.totalSales)} in total sales.
          </span>
        </div>
      )}

      {/* Earnings Over Time */}
      {analytics && analytics.earningsOverTime.length > 0 && (
        <section className="dashboard-section">
          <h2>Recent Earnings</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Commission</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {analytics.earningsOverTime.slice(0, 14).map((entry) => (
                  <tr key={entry.date}>
                    <td>{new Date(entry.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</td>
                    <td>{formatPrice(entry.sales)}</td>
                    <td className="text-muted">{formatPrice(entry.commission)}</td>
                    <td><strong>{formatPrice(entry.net)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section className="dashboard-section">
        <h2>Quick Links</h2>
        <div className="quick-links-grid">
          <Link to="/vendor/products" className="quick-link-card">
            <span className="material-icons">inventory_2</span>
            <span>Manage Products</span>
          </Link>
          <Link to="/vendor/orders" className="quick-link-card">
            <span className="material-icons">local_shipping</span>
            <span>View Orders</span>
          </Link>
          <Link to="/vendor/reviews" className="quick-link-card">
            <span className="material-icons">star_rate</span>
            <span>Customer Reviews</span>
          </Link>
          <Link to="/vendor/settings" className="quick-link-card">
            <span className="material-icons">settings</span>
            <span>Store Settings</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
