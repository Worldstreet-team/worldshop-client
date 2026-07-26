import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';

const navItems = [
  // Products, orders, inventory, vendors and withdrawals were ecommerce
  // surfaces — listings belong to stores now, and moderation happens through
  // the report queue.
  { path: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/categories', label: 'Categories', icon: 'category' },
  { path: '/admin/users', label: 'Users', icon: 'group' },
];

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  const handleLogout = async () => {
    await signOut();
    logout();
    navigate('/');
  };

  return (
    <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      <button
        type="button"
        className="admin-sidebar-backdrop"
        aria-label="Close admin navigation"
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="sidebar-header">
          <img src="/images/worldstreet-mark.png" alt="WorldStreet Admin" className="sidebar-logo" />
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
              onClick={() => setMobileSidebarOpen(false)}
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
          <NavLink to="/" className="sidebar-nav-item" onClick={() => setMobileSidebarOpen(false)}>
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
            <button
              type="button"
              className="admin-mobile-menu-btn"
              aria-label="Open admin navigation"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <span className="material-icons">menu</span>
            </button>
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
