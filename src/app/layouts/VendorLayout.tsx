import { useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import {
  ArrowLeftFromLine, Bell, Compass, Eye, EyeOff, GraduationCap, Home, LogOut, Menu,
  MessagesSquare, Package, Plus, Search, Settings, Star, TrendingUp, Users, Wallet, X, Zap,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useVendorDashboard } from '@/features/stores/hooks/useVendorDashboard';
import ToastContainer from '@/shared/components/ui/ToastContainer';
import { writeLocal } from '@/shared/utils/storage';

type NavItem = { path: string; label: string; Icon: LucideIcon; badge?: number };

const WALLET_URL = 'https://dashboard.worldstreetgold.com';

// Kept from the old sidebar: the rest of the ecosystem is one click away.
const ECOSYSTEM: Array<{ href: string; label: string; Icon: LucideIcon }> = [
  { href: 'https://dashboard.worldstreetgold.com', label: 'Dashboard', Icon: Compass },
  { href: 'https://academy.worldstreetgold.com', label: 'Academy', Icon: GraduationCap },
  { href: 'https://social.worldstreetgold.com', label: 'Social', Icon: Users },
  // Label per the DS link set ("Xstream"); the subdomain is what it is.
  { href: 'https://xtreme.worldstreetgold.com', label: 'Xstream', Icon: Zap },
  { href: 'https://trader.worldstreetgold.com', label: 'Trader', Icon: TrendingUp },
];

const usd = (minor: number) =>
  `$${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function isActive(pathname: string, path: string) {
  return path === '/vendor' ? pathname === '/vendor' : pathname.startsWith(path);
}

function Group({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section className="ws-vxnav__group">
      {label && <h3 className="ws-vxnav__label">{label}</h3>}
      <ul>{children}</ul>
    </section>
  );
}

function Sidebar({ items, onNavigate, plan }: { items: NavItem[]; onNavigate?: () => void; plan?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const link = ({ path, label, Icon, badge }: NavItem) => {
    const on = isActive(pathname, path);
    return (
      <li key={path}>
        <Link
          to={path}
          aria-current={on ? 'page' : undefined}
          className={`ws-vxnav__item${on ? ' is-on' : ''}`}
          onClick={onNavigate}
        >
          <Icon size={18} aria-hidden />
          <span className="ws-vxnav__text">{label}</span>
          {badge ? <span className="ws-vxnav__badge ws-num">{badge > 99 ? '99+' : badge}</span> : null}
        </Link>
      </li>
    );
  };

  return (
    <div className="ws-vxside">
      <div className="ws-vxside__brand">
        <img src="/brand/wsa-tile.png" alt="" width={32} height={32} />
        <span className="ws-vxside__word">Marketplace</span>
        {plan && <span className="ws-vxside__plan">{plan}</span>}
      </div>

      <nav aria-label="Vendor workspace" className="ws-vxnav">
        <Group>{items.slice(0, 4).map(link)}</Group>
        <Group label="Shop">{items.slice(4).map(link)}</Group>
        <Group label="WorldStreet">
          {ECOSYSTEM.map(({ href, label, Icon }) => (
            <li key={href}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="ws-vxnav__item" onClick={onNavigate}>
                <Icon size={18} aria-hidden />
                <span className="ws-vxnav__text">{label}</span>
              </a>
            </li>
          ))}
        </Group>
      </nav>

      <div className="ws-vxside__foot">
        <button
          type="button"
          className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary ws-vxside__cta"
          onClick={() => {
            navigate('/vendor/products/new');
            onNavigate?.();
          }}
        >
          <Plus size={16} aria-hidden />
          Create listing
        </button>
        <Link to="/" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost ws-vxside__back" onClick={onNavigate}>
          <ArrowLeftFromLine size={16} aria-hidden />
          Back to marketplace
        </Link>
      </div>
    </div>
  );
}

/**
 * The vendor workspace, ported from the sandbox's /vendor shell: a fixed
 * sidebar, a sticky top bar with search and the wallet, the page beside them.
 *
 * Not ported: Orders and payouts. Nothing is bought on the platform, so there
 * is no order to show. The sandbox's "Earnings" pill is the WorldStreet dollar
 * wallet here, the one the subscription is charged to.
 */
export default function VendorLayout() {
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(() => localStorage.getItem('ws:balance-hidden') === '1');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { logout } = useAuthStore();
  const { data } = useVendorDashboard();

  const items: NavItem[] = [
    { path: '/vendor', label: 'Overview', Icon: Home },
    { path: '/vendor/products', label: 'Listings', Icon: Package },
    { path: '/vendor/messages', label: 'Messages', Icon: MessagesSquare, badge: data?.inbox.unread },
    // Not in the sandbox, which has no reviews for sellers to answer.
    { path: '/vendor/reviews', label: 'Reviews', Icon: Star },
    { path: '/vendor/settings', label: 'Shop settings', Icon: Settings },
  ];
  const current = items.find((i) => isActive(pathname, i.path));

  // Any route change closes the drawer, not only a click on one of its links.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setDrawer(false);
  }

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [drawer]);

  const toggleHidden = () =>
    setHidden((v) => {
      writeLocal('ws:balance-hidden', v ? '0' : '1');
      return !v;
    });

  const handleLogout = async () => {
    await signOut();
    logout();
    navigate('/');
  };

  const store = data?.store;
  const wallet = data?.wallet;

  return (
    <div className="ws-vx">
      <a href="#vendor-main" className="ws-vx__skip">Skip to workspace</a>

      <aside className="ws-vx__side">
        <Sidebar items={items} plan={data?.subscription?.plan.name} />
      </aside>

      <header className="ws-vxbar">
        <div className="ws-vxbar__start">
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost ws-vxbar__burger"
            aria-label="Open navigation"
            onClick={() => setDrawer(true)}
          >
            <Menu size={18} aria-hidden />
          </button>

          <form
            role="search"
            className="ws-vxbar__search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              navigate(q ? `/vendor/products?q=${encodeURIComponent(q)}` : '/vendor/products');
            }}
          >
            <Search size={20} aria-hidden />
            <label className="ws-sr-only" htmlFor="vendor-search">Search vendor workspace</label>
            <input
              id="vendor-search"
              type="search"
              placeholder="Search your listings"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>

          <div className="ws-vxbar__where">
            <p>Vendor</p>
            <p>{current?.label ?? 'Listings'}</p>
          </div>
        </div>

        <div className="ws-vxbar__end">
          {wallet && (
            <div className="ws-vxbar__wallet">
              <Wallet size={16} aria-hidden />
              <span>
                <span className="ws-vxbar__wlabel">Wallet</span>
                <span className="ws-vxbar__wvalue ws-num">{hidden ? '••••' : usd(wallet.availableMinor)}</span>
              </span>
            </div>
          )}
          <a href={WALLET_URL} target="_blank" rel="noopener noreferrer" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--outline ws-vxbar__wide">
            <Wallet size={16} aria-hidden />
            Add to WorldStreet
          </a>
          <a href={WALLET_URL} target="_blank" rel="noopener noreferrer" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost ws-vxbar__wide">
            <ArrowLeftFromLine size={16} aria-hidden />
            Move funds
          </a>
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost ws-vxbar__wide"
            aria-label={hidden ? 'Show balances' : 'Hide balances'}
            aria-pressed={hidden}
            onClick={toggleHidden}
          >
            {hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
          </button>
          <Link to="/vendor/settings" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost ws-vxbar__wide" aria-label="Vendor settings">
            <Settings size={16} aria-hidden />
          </Link>
          {/* Buyer messages are the only notifications a seller gets. */}
          <Link to="/vendor/messages" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost ws-vxbar__wide ws-vxbar__bell" aria-label="Notifications">
            <Bell size={16} aria-hidden />
            {data?.inbox.unread ? <span className="ws-vxbar__dot" aria-hidden /> : null}
          </Link>
          <span className="ws-vxbar__avatar" title={store?.name}>
            {store?.logo ? <img src={store.logo} alt="" /> : (store?.name ?? 'S').charAt(0).toUpperCase()}
          </span>
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost"
            aria-label="Log out"
            title="Log out"
            onClick={handleLogout}
          >
            <LogOut size={16} aria-hidden />
          </button>
        </div>
      </header>

      {drawer && (
        <div className="ws-vxdrawer" role="dialog" aria-modal="true" aria-label="Vendor navigation">
          <button type="button" className="ws-vxdrawer__scrim" aria-label="Close navigation" onClick={() => setDrawer(false)} />
          <aside className="ws-vxdrawer__panel">
            <button
              type="button"
              className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--icon ws-ldbtn--ghost ws-vxdrawer__close"
              aria-label="Close navigation"
              onClick={() => setDrawer(false)}
            >
              <X size={18} aria-hidden />
            </button>
            <Sidebar items={items} plan={data?.subscription?.plan.name} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <main id="vendor-main" className="ws-vx__main">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
}
