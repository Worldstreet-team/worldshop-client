import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/products', label: 'Products', icon: 'inventory' },
  { path: '/admin/orders', label: 'Orders', icon: 'shopping_cart' },
  { path: '/admin/categories', label: 'Categories', icon: 'category' },
  { path: '/admin/inventory', label: 'Inventory', icon: 'warehouse' },
  { path: '/admin/vendors', label: 'Vendors', icon: 'storefront' },
];

export default function AdminLayout() {
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
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <img src="/images/logo-wordmark-light.svg" alt="WorldStreet Admin" className="sidebar-logo" />
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
              end={item.path === '/admin'}
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
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-header">
          <div className="admin-header-left">
            <h1 className="admin-title">Admin Panel</h1>
          </div>

          <div className="admin-header-right">
            <div className="admin-user-menu">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <button onClick={handleLogout} className="logout-btn">
                <span className="material-icons">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
