import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search, Heart, MessageCircle, Menu, Moon, Store, Sun, User, LayoutGrid, Building2,
  Compass, Eye, EyeOff, Smartphone, Car, Shirt, House, ShoppingBag, X, ChevronsUp,
  Wallet as WalletIcon, type LucideIcon,
} from 'lucide-react';
import { isLight, toggleTheme } from '@/shared/utils/theme';
import { savedListings } from '@/features/listings/savedListings';
import { firstImage, priceLabel } from '@/features/listings/model';
import LocationSelect from '@/app/layouts/components/LocationSelect';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';
import { useCategories } from '@/features/catalog/hooks/useCategories';
import { useUnreadCount } from '@/features/chat/hooks/useUnreadCount';
import { useSearchSuggestions } from '@/features/listings/hooks/useSearchSuggestions';
import { useWalletBalance } from '@/features/wallet/hooks/useWalletBalance';

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
  const { categories } = useCategories();

  const urlSearch = params.get('search') ?? '';
  const [searchBox, setSearchBox] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchBox(urlSearch);
  }

        const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileSearchOpen(false);
  }

  useEffect(() => {
    if (!mobileSearchOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileSearchOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileSearchOpen]);

  const [light, setLight] = useState(isLight);
  const savedCount = useSyncExternalStore(savedListings.subscribe, savedListings.count);
  const { suggestions, suggestLoading } = useSearchSuggestions(searchBox, mobileSearchOpen);


  const unread = useUnreadCount(isAuthenticated);
  const { balance, balanceHidden, toggleBalance } = useWalletBalance(isAuthenticated);

  const topCategories = useMemo(() => {
    const withChildren = new Set(categories.map((c) => c.parentId).filter(Boolean));
    return categories.filter((c) => !c.parentId && withChildren.has(c.id));
  }, [categories]);

  const selectedId = params.get('categoryId') ?? '';
    const activeCategory = useMemo(() => {
    const selected = categories.find((c) => c.id === selectedId);
    return selected?.parentId ?? selectedId;
  }, [categories, selectedId]);
  const activeCountry = params.get('country') ?? '';
  const activeState = params.get('state') ?? '';
  const onBrowse = location.pathname === '/' || location.pathname.startsWith('/listings');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchBox.trim();
    navigate(q ? `/listings?search=${encodeURIComponent(q)}` : '/listings');
  };

  const setLocation = (country: string, state: string) => {
    const next = new URLSearchParams(onBrowse ? params : undefined);
    if (country) next.set('country', country); else next.delete('country');
    if (state) next.set('state', state); else next.delete('state');
    next.delete('page');
    navigate(`/listings?${next.toString()}`);
  };

  const goCategory = (id: string) => {
    const next = new URLSearchParams();
    const search = params.get('search');
    if (search) next.set('search', search);
    if (activeCountry) next.set('country', activeCountry);
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

          <Link to="/" className="ws-brand" aria-label="WorldStore home">

            <img src="/brand/wsa-mark.png" alt="" className="ws-brand__mark" />
            <span className="ws-brand__stack">
              <span className="ws-brand__word">WorldStore</span>
            </span>
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
              <LocationSelect country={activeCountry} state={activeState} onChange={setLocation} />
            </div>
          </form>

          <div className="ws-topbar__actions">

            <button
              type="button"
              className="ws-iconbtn ws-topbar__searchtoggle"
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label={mobileSearchOpen ? 'Close search' : 'Search'}
              aria-expanded={mobileSearchOpen}
              aria-controls="mobile-search-form"
            >
              {mobileSearchOpen ? <ChevronsUp size={20} /> : <Search size={20} />}
            </button>

            {balance && (
              <div className="ws-balance ws-topbar__balance">
                <a
                  href="https://dashboard.worldstreetgold.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WorldStreet wallet (opens in a new tab)"
                >
                  <WalletIcon size={15} aria-hidden />
                  <span className="ws-num">
                    {balanceHidden
                      ? '••••'
                      : new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: balance.currency || 'USD',
                        }).format(balance.availableMinor / 100)}
                  </span>
                </a>
                <button
                  type="button"
                  className="ws-balance__eye"
                  onClick={toggleBalance}
                  aria-label={balanceHidden ? 'Show balance' : 'Hide balance'}
                >
                  {balanceHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}

            <button
              type="button"
              className="ws-iconbtn"
              onClick={() => setLight(toggleTheme() === 'platform-light')}
              aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
              title={light ? 'Dark mode' : 'Light mode'}
            >
              {light ? <Moon size={18} /> : <Sun size={18} />}
            </button>

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

            <Link
              to="/saved"
              className="ws-iconbtn"
              aria-label={savedCount ? `Saved listings, ${savedCount} saved` : 'Saved listings'}
              title="Saved listings"
            >
              <Heart size={18} />
              {savedCount > 0 && <span className="ws-iconbtn__dot" />}
            </Link>

            <Link
              to="/malls"
              className="ws-iconbtn ws-topbar__malls"
              aria-label="Browse malls"
              title="Malls"
            >
              <Building2 size={18} />
              <span className="ws-topbar__malls-label">Malls</span>
            </Link>

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

      {mobileSearchOpen && createPortal(
        <div
          className="ws-searchpop"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileSearchOpen(false); }}
        >
          <div className="ws-searchpop__row">
            <form
              id="mobile-search-form"
              className="ws-search ws-searchpop__bar"
              onSubmit={(e) => { submitSearch(e); setMobileSearchOpen(false); }}
              role="search"
            >
              <Search size={18} aria-hidden />
              <input
                type="search"
                value={searchBox}
                onChange={(e) => setSearchBox(e.target.value)}
                placeholder="Search phones, cars, furniture…"
                aria-label="Search the marketplace"
                autoFocus
              />
              {searchBox && (
                <button
                  type="button"
                  className="ws-searchpop__clear"
                                                    onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearchBox('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            <button
              type="button"
              className="ws-iconbtn ws-searchpop__close"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
            >
              <ChevronsUp size={20} />
            </button>
          </div>

          {searchBox.trim().length >= 2 && (suggestLoading || suggestions.length > 0) && (
            <ul className="ws-searchpop__suggestions">
              {suggestions.length > 0 ? (
                suggestions.map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/listings/${l.slug}`}
                      className="ws-searchpop__suggestion"
                      onClick={() => setMobileSearchOpen(false)}
                    >
                      {firstImage(l) ? (
                        <img src={firstImage(l)!} alt="" className="ws-searchpop__thumb" />
                      ) : (
                        <span className="ws-searchpop__thumb ws-searchpop__thumb--empty" aria-hidden>
                          <Search size={14} />
                        </span>
                      )}
                      <span className="ws-searchpop__suggestion-text">
                        <span className="ws-searchpop__suggestion-name">{l.name}</span>
                        <span className="ws-searchpop__suggestion-price ws-num">{priceLabel(l)}</span>
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="ws-searchpop__suggestion--hint">Searching…</li>
              )}
            </ul>
          )}
        </div>,
        document.body,
      )}

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
