import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import {
  LayoutDashboard, Package, MessageCircle, Star, Settings, Store,
  Menu, LogOut, ChevronLeft, ChevronRight, Compass, GraduationCap,
  Users, Zap, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/ui/ToastContainer';

const navItems: { path: string; label: string; Icon: LucideIcon }[] = [
  { path: '/vendor', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/vendor/products', label: 'Listings', Icon: Package },
  // Buyers reach vendors here — nothing is ordered or paid for on the
  // platform, so Orders and Withdrawals no longer exist.
  { path: '/vendor/messages', label: 'Messages', Icon: MessageCircle },
  { path: '/vendor/reviews', label: 'Reviews', Icon: Star },
  { path: '/vendor/settings', label: 'Store Settings', Icon: Settings },
];

const ecosystemLinks: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: 'https://dashboard.worldstreetgold.com', label: 'Dashboard', Icon: Compass },
  { href: 'https://academy.worldstreetgold.com', label: 'Academy', Icon: GraduationCap },
  { href: 'https://social.worldstreetgold.com', label: 'Social', Icon: Users },
  { href: 'https://xtreme.worldstreetgold.com', label: 'Xtreme', Icon: Zap },
  { href: 'https://trader.worldstreetgold.com', label: 'Trader', Icon: TrendingUp },
];

export default function VendorLayout() {
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
        aria-label="Close vendor navigation"
        onClick={close}
      />

      <aside className="ws-console__side" aria-label="Vendor navigation">
        <div className="ws-console__brand">
          <span>{user?.storeName || 'Vendor Portal'}</span>
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
              end={path === '/vendor'}
              onClick={close}
              className="ws-console__link"
            >
              <Icon size={18} aria-hidden />
              <span className="ws-console__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ws-console__section">WorldStreet Ecosystem</div>
        <nav className="ws-console__nav">
          {ecosystemLinks.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="ws-console__link"
              onClick={close}
            >
              <Icon size={18} aria-hidden />
              <span className="ws-console__label">{label}</span>
            </a>
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
              aria-label="Open vendor navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="ws-h2">Vendor Dashboard</h1>
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
