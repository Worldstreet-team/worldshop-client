import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';

const navItems = [
  { path: '/vendor', label: 'Dashboard', icon: 'dashboard' },
  { path: '/vendor/products', label: 'Products', icon: 'inventory' },
  { path: '/vendor/orders', label: 'Orders', icon: 'shopping_cart' },
  { path: '/vendor/reviews', label: 'Reviews', icon: 'star_rate' },
  { path: '/vendor/settings', label: 'Store Settings', icon: 'settings' },
];

export default function VendorLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    logout();
    navigate('/');
  };

  return (
    <div className={`vendor-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-brand">{user?.storeName || 'Vendor Portal'}</span>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-icons">
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/vendor'}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="material-icons">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/" className="sidebar-nav-item">
            <span className="material-icons">storefront</span>
            <span className="nav-label">View Store</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <div className="vendor-main">
        {/* Top Bar */}
        <header className="vendor-header">
          <div className="vendor-header-left">
            <h1 className="vendor-title">Vendor Dashboard</h1>
          </div>

          <div className="vendor-header-right">
            <div className="vendor-user-menu">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <button onClick={handleLogout} className="logout-btn">
                <span className="material-icons">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="vendor-content">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
