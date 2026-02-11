import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type DashboardStats } from '@/services/adminService';
import { useUIStore } from '@/store/uiStore';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v);

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminService.getDashboardStats();
        setStats(data);
      } catch (err: any) {
        addToast({ type: 'error', message: err.message || 'Failed to load dashboard' });
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const cards = stats
    ? [
      { label: 'Total Orders', value: String(stats.totalOrders), icon: 'shopping_cart' },
      { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: 'payments' },
      { label: 'Active Products', value: `${stats.activeProducts} / ${stats.totalProducts}`, icon: 'inventory' },
      { label: 'Categories', value: String(stats.totalCategories), icon: 'category' },
    ]
    : [];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card skeleton" />
          ))
          : cards.map((c) => (
            <div key={c.label} className="stat-card">
              <div className="stat-icon">
                <span className="material-icons">{c.icon}</span>
              </div>
              <div className="stat-content">
                <h3>{c.value}</h3>
                <p>{c.label}</p>
              </div>
            </div>
          ))}
      </div>

      {/* Alerts Row */}
      {stats && (stats.outOfStockProducts > 0 || stats.lowStockProducts > 0) && (
        <div className="stats-grid" style={{ marginTop: '1rem' }}>
          {stats.outOfStockProducts > 0 && (
            <div className="stat-card stat-card--danger">
              <div className="stat-icon"><span className="material-icons">error</span></div>
              <div className="stat-content">
                <h3>{stats.outOfStockProducts}</h3>
                <p>Out of Stock</p>
              </div>
            </div>
          )}
          {stats.lowStockProducts > 0 && (
            <div className="stat-card stat-card--warning">
              <div className="stat-icon"><span className="material-icons">warning</span></div>
              <div className="stat-content">
                <h3>{stats.lowStockProducts}</h3>
                <p>Low Stock</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Orders */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        {!stats || stats.recentOrders.length === 0 ? (
          <div className="empty-state">
            <p>No recent orders to display.</p>
          </div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o: any) => (
                  <tr key={o.id}>
                    <td><Link to={`/admin/orders/${o.id}`}>{o.orderNumber || o.id.slice(-8)}</Link></td>
                    <td>{o.customerName || '—'}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td><span className={`badge badge-${o.status?.toLowerCase()}`}>{o.status}</span></td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
