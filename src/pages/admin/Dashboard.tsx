export default function AdminDashboard() {
  // Mock stats - will be replaced with API data
  const stats = [
    { label: 'Total Orders', value: '0', icon: 'shopping_cart', change: '+0%' },
    { label: 'Total Revenue', value: '₦0', icon: 'payments', change: '+0%' },
    { label: 'Products', value: '0', icon: 'inventory', change: '0' },
    { label: 'Customers', value: '0', icon: 'people', change: '+0%' },
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your admin dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon">
              <span className="material-icons">{stat.icon}</span>
            </div>
            <div className="stat-content">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
              <span className="stat-change">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <section className="dashboard-section">
        <h2>Recent Orders</h2>
        <div className="empty-state">
          <p>No recent orders to display.</p>
        </div>
      </section>

      {/* Low Stock Alerts */}
      <section className="dashboard-section">
        <h2>Low Stock Alerts</h2>
        <div className="empty-state">
          <p>No low stock items.</p>
        </div>
      </section>
    </div>
  );
}
