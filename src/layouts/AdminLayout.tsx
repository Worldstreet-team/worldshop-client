import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import {
  LayoutDashboard, FolderTree, Users, Store, Menu, LogOut,
  ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';

const navItems: { path: string; label: string; Icon: LucideIcon }[] = [
  // Products, orders, inventory, vendors and withdrawals were ecommerce
  // surfaces — listings belong to stores now, and moderation happens through
  // the report queue.
  { path: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/admin/categories', label: 'Categories', Icon: FolderTree },
  { path: '/admin/users', label: 'Users', Icon: Users },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await signOut();
    logout();
    navigate('/');
  };

  const close = () => setMobileOpen(false);

  return (
    <div
      className={`ws ws-console${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="ws-console__backdrop"
        aria-label="Close admin navigation"
        onClick={close}
      />

      <aside className="ws-console__side" aria-label="Admin navigation">
        <div className="ws-console__brand">
          <span>Admin</span>
          <button
            className="ws-iconbtn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="ws-console__nav">
          {navItems.map(({ path, label, Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/admin'}
              onClick={close}
              className="ws-console__link"
            >
              <Icon size={18} aria-hidden />
              <span className="ws-console__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ws-console__foot">
          <nav className="ws-console__nav">
            <NavLink to="/" className="ws-console__link" onClick={close} end>
              <Store size={18} aria-hidden />
              <span className="ws-console__label">View Store</span>
            </NavLink>
          </nav>
        </div>
      </aside>

      <div className="ws-console__main">
        <header className="ws-console__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)', minWidth: 0 }}>
            <button
              type="button"
              className="ws-iconbtn ws-console__burger"
              aria-label="Open admin navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="ws-h2">Admin Panel</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-3)' }}>
            <span className="ws-caption ws-muted">
              {user?.firstName} {user?.lastName}
            </span>
            <button onClick={handleLogout} className="ws-btn ws-btn--sm ws-btn--ghost">
              <LogOut size={14} aria-hidden />
              Log out
            </button>
          </div>
        </header>

        <main className="ws-console__body">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
