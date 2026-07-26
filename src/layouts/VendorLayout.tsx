import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';

const navItems = [
  { path: '/vendor', label: 'Dashboard', icon: 'dashboard' },
  { path: '/vendor/products', label: 'Listings', icon: 'inventory' },
  // Buyers reach vendors here — nothing is ordered or paid for on the
  // platform, so Orders and Withdrawals no longer exist.
  { path: '/vendor/messages', label: 'Messages', icon: 'forum' },
  { path: '/vendor/reviews', label: 'Reviews', icon: 'star_rate' },
  { path: '/vendor/settings', label: 'Store Settings', icon: 'settings' },
];

const ecosystemLinks = [
  { href: 'https://dashboard.worldstreetgold.com', label: 'Dashboard', icon: 'dashboard' },
  { href: 'https://academy.worldstreetgold.com', label: 'Academy', icon: 'school' },
  { href: 'https://social.worldstreetgold.com', label: 'Social', icon: 'groups' },
  { href: 'https://xtreme.worldstreetgold.com', label: 'Xtreme', icon: 'bolt' },
  { href: 'https://trader.worldstreetgold.com', label: 'Trader', icon: 'trending_up' },
];

export default function VendorLayout() {
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
    <div className={`vendor-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      <button
        type="button"
        className="vendor-sidebar-backdrop"
        aria-label="Close vendor navigation"
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className="vendor-sidebar" aria-label="Vendor navigation">
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

        <div className="sidebar-section-label">
          <span className="nav-label">WorldStreet Ecosystem</span>
        </div>
        <nav className="sidebar-nav">
          {ecosystemLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-nav-item"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <span className="material-icons">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </a>
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
      <div className="vendor-main">
        {/* Top Bar */}
        <header className="vendor-header">
          <div className="vendor-header-left">
            <button
              type="button"
              className="vendor-mobile-menu-btn"
              aria-label="Open vendor navigation"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <span className="material-icons">menu</span>
            </button>
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
