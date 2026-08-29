import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search, Heart, MessageCircle, Menu, Moon, Store, Sun, User, LayoutGrid,
  Compass, Eye, EyeOff, Smartphone, Car, Shirt, House, ShoppingBag, X, ChevronsUp,
  Wallet as WalletIcon, type LucideIcon,
} from 'lucide-react';
import { isLight, toggleTheme } from '@/utils/theme';
import { savedListings } from '@/utils/savedListings';
import { firstImage, priceLabel } from '@/utils/listingFormat';
import LocationSelect from '@/components/layout/LocationSelect';
import { walletService, type Wallet } from '@/services/walletService';
import { publicMarketplace, type Listing, type PublicStore } from '@/services/storeService';
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

  const urlSearch = params.get('search') ?? '';
  const [searchBox, setSearchBox] = useState(urlSearch);
  // The search box mirrors the URL so a shared link shows its own query —
  // adjusted during render (not in an effect) per react.dev's derived-state
  // guidance, guarded so it only fires when the URL itself changes.
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchBox(urlSearch);
  }

  // The pill search only fits inline from $bp-sm up (see _marketplace.scss);
  // below that it has no room next to the brand and hamburger. A toggle opens
  // it as a floating overlay rather than an inline row, so it never pushes
  // the category-chip bar down or desyncs --ws-header-h. Closed on navigation
  // (derived at render, like searchBox above) so it never stays open over an
  // unrelated page.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileSearchOpen(false);
  }

  // Body scroll lock + Escape-to-close, same treatment MobileMenu gives its
  // drawer — this is the same kind of full-screen overlay, just a takeover
  // from the top instead of a side sheet.
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

  // Live suggestions while the overlay is open — debounced so each keystroke
  // doesn't fire its own request, and scoped to the overlay (not the desktop
  // pill, which shares searchBox) so typing elsewhere never triggers it.
  const [suggestions, setSuggestions] = useState<Array<Listing & { store: PublicStore }>>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  useEffect(() => {
    const q = searchBox.trim();
    if (!mobileSearchOpen || q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setSuggestLoading(true);
      publicMarketplace.browse({ search: q, limit: 5 })
        .then((res) => { if (!cancelled) setSuggestions(res.data); })
        .catch(() => { if (!cancelled) setSuggestions([]); })
        .finally(() => { if (!cancelled) setSuggestLoading(false); });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchBox, mobileSearchOpen]);

  const [unreadTotal, setUnreadTotal] = useState(0);
  const [light, setLight] = useState(isLight);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(
    () => localStorage.getItem('ws:balance-hidden') === '1',
  );
  const savedCount = useSyncExternalStore(savedListings.subscribe, savedListings.count);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Signed-out state is derived at render (`unread` below), like the wallet
  // pill — resetting in the effect would be a synchronous setState.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    chatService.unread()
      .then((res) => { if (!cancelled) setUnreadTotal(res.data.total); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const unread = isAuthenticated ? unreadTotal : 0;

  // Wallet balance for the navbar pill. Signed-out state is derived at render
  // (`balance` below) rather than reset here, so nothing stale ever shows.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    walletService.get()
      // The shape check matters: a backend without /wallet answers with an
      // empty envelope, and a pill saying "$NaN" is worse than no pill.
      .then((res) => {
        if (!cancelled && typeof res.data?.availableMinor === 'number') setWallet(res.data);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const balance = isAuthenticated ? wallet : null;

  const toggleBalance = () => {
    setBalanceHidden((v) => {
      const next = !v;
      try {
        localStorage.setItem('ws:balance-hidden', next ? '1' : '0');
      } catch {
        // Private mode: hidden state lasts for the session only.
      }
      return next;
    });
  };

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

          <Link to="/" className="ws-brand" aria-label="WorldStore home">
            {/* Unified ecosystem lockup (05-screens): gold wsa-mark 26px +
                "WorldStore" Poppins SemiBold 15 + gold app eyebrow. */}
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
              <LocationSelect value={activeState} onChange={setLocation} />
            </div>
          </form>

          <div className="ws-topbar__actions">
            {/* Below $bp-sm the pill search is hidden entirely (no room next
                to the brand and hamburger) — this is its only way in there. */}
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

            {/* The shared WorldStreet dollar wallet; funding lives in the
                wallet app, so the amount links out rather than in. */}
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

            <Link
              to="/saved"
              className="ws-iconbtn"
              aria-label={savedCount ? `Saved listings, ${savedCount} saved` : 'Saved listings'}
              title="Saved listings"
            >
              <Heart size={18} />
              {savedCount > 0 && <span className="ws-iconbtn__dot" />}
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

      {/* Portaled so it floats over the page rather than sitting in normal
          flow — an inline row here would push the category chips down and
          throw off --ws-header-h, which other sticky elements rely on. */}
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
                  // Keeps focus on the input instead of the browser moving it
                  // to this button on click, so typing can resume immediately.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearchBox('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </form>

            {/* The header's own toggle still closes this too, but it sits
                behind the blurred scrim once the popup is open — this is the
                clearly-visible, on-top way to dismiss it. */}
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
