import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search, MessageCircle, Menu, Moon, Store, Sun, User, LayoutGrid,
  Compass, Smartphone, Car, Shirt, House, ShoppingBag, type LucideIcon,
} from 'lucide-react';
import { isLight, toggleTheme } from '@/utils/theme';
import LocationSelect from '@/components/layout/LocationSelect';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useCategoryStore } from '@/store/categoryStore';
import { chatService } from '@/services/chatService';

/**
 * Marketplace top bar — the Shop pattern from the design system: brand lockup,
 * pill search, location pill, avatar, then a scrolling row of category chips.
 *
 * Nothing is bought here, so the bar has two jobs: find something, or go sell
 * something. There is no cart, no wishlist badge, no sale tab.
 */

/**
 * Category chips carry an icon (05-screens: "icon 17 + label Medium 13"). The
 * API has no icon field, so departments map to the lucide names the icon set
 * already reserves for Shop: smartphone, car, shirt, house, shopping-bag.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  electronics: Smartphone,
  vehicles: Car,
  fashion: Shirt,
  'home-property': House,
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
  const { toggleMobileMenu } = useUIStore();
  const { categories, fetchCategories } = useCategoryStore();

  const [searchBox, setSearchBox] = useState(params.get('search') ?? '');
  const [unread, setUnread] = useState(0);
  const [light, setLight] = useState(isLight);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // The search box mirrors the URL so a shared link shows its own query.
  useEffect(() => { setSearchBox(params.get('search') ?? ''); }, [params]);

  useEffect(() => {
    if (!isAuthenticated) { setUnread(0); return; }
    let cancelled = false;
    chatService.unread()
      .then((res) => { if (!cancelled) setUnread(res.data.total); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Only top-level categories earn a chip; the rail handles the rest.
  const topCategories = useMemo(() => {
    const withChildren = new Set(categories.map((c) => c.parentId).filter(Boolean));
    return categories.filter((c) => !c.parentId && withChildren.has(c.id));
  }, [categories]);

  const selectedId = params.get('categoryId') ?? '';
  // A chip stays lit while you are inside one of its subcategories — otherwise
  // drilling into "Phones" makes the "Electronics" chip look unselected.
  const activeCategory = useMemo(() => {
    const selected = categories.find((c) => c.id === selectedId);
    return selected?.parentId ?? selectedId;
  }, [categories, selectedId]);
  const activeState = params.get('state') ?? '';
  const onBrowse = location.pathname === '/' || location.pathname.startsWith('/listings');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchBox.trim();
    navigate(q ? `/listings?search=${encodeURIComponent(q)}` : '/listings');
  };

  const setLocation = (value: string) => {
    const next = new URLSearchParams(onBrowse ? params : undefined);
    if (value) next.set('state', value); else next.delete('state');
    next.delete('page');
    navigate(`/listings?${next.toString()}`);
  };

  const goCategory = (id: string) => {
    const next = new URLSearchParams();
    // Switching department drops attribute facets — they belong to the old one.
    const search = params.get('search');
    if (search) next.set('search', search);
    if (activeState) next.set('state', activeState);
    if (id) next.set('categoryId', id);
    navigate(`/listings?${next.toString()}`);
  };

  return (
    <header className="ws-topbar">
      <div className="ws-wrap">
        <div className="ws-topbar__row">
          <button
            className="ws-iconbtn ws-topbar__menu"
            onClick={toggleMobileMenu}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="ws-brand" aria-label="WorldShop home">
            <span className="ws-brand__eyebrow">Worldstreet</span>
            <span className="ws-brand__word">shop<span className="ws-brand__dot">.</span></span>
          </Link>

          <form className="ws-search ws-topbar__search" onSubmit={submitSearch} role="search">
            <Search size={18} aria-hidden />
            <input
              type="search"
              value={searchBox}
              onChange={(e) => setSearchBox(e.target.value)}
              placeholder="Search phones, cars, furniture…"
              aria-label="Search the marketplace"
            />
            <div className="ws-topbar__location">
              <LocationSelect value={activeState} onChange={setLocation} />
            </div>
          </form>

          <div className="ws-topbar__actions">
            <button
              type="button"
              className="ws-iconbtn"
              onClick={() => setLight(toggleTheme() === 'platform-light')}
              aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
              title={light ? 'Dark mode' : 'Light mode'}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Admins reach the console from here; there is no other entry
                point once the old nav row is gone. */}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <Link to="/admin" className="ws-iconbtn ws-topbar__admin" aria-label="Admin console">
                <LayoutGrid size={18} />
              </Link>
            )}

            <a
              href="https://dashboard.worldstreetgold.com"
              className="ws-iconbtn ws-topbar__admin"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WorldStreet dashboard (opens in a new tab)"
              title="WorldStreet dashboard"
            >
              <Compass size={18} />
            </a>

            <Link to="/vendor" className="ws-btn ws-btn--sm ws-btn--primary ws-topbar__sell">
              <Store size={16} aria-hidden />
              Sell
            </Link>

            {isAuthenticated && (
              <Link to="/account/messages" className="ws-iconbtn" aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}>
                <MessageCircle size={20} />
                {unread > 0 && <span className="ws-iconbtn__dot" />}
              </Link>
            )}

            <Link
              to="/account"
              className="ws-avatar ws-avatar--m"
              aria-label={isAuthenticated ? 'Your account' : 'Sign in'}
            >
              {isAuthenticated && user?.firstName
                ? user.firstName.charAt(0).toUpperCase()
                : <User size={16} aria-hidden />}
            </Link>
          </div>
        </div>
      </div>

      {/* Category chips. Kept out of the sticky row so the bar stays 64px. */}
      <div className="ws-catbar">
        <div className="ws-wrap">
          <div className="ws-catbar__scroll">
            <button
              type="button"
              className={`ws-chip${!activeCategory ? ' is-active' : ''}`}
              aria-pressed={!activeCategory}
              onClick={() => goCategory('')}
            >
              <ShoppingBag size={16} aria-hidden />
              All
            </button>
            {topCategories.map((c) => {
              const Icon = CATEGORY_ICON[c.slug] ?? ShoppingBag;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`ws-chip${activeCategory === c.id ? ' is-active' : ''}`}
                  aria-pressed={activeCategory === c.id}
                  onClick={() => goCategory(c.id)}
                >
                  <Icon size={16} aria-hidden />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
