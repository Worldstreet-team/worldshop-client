import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import {
  X, Home, Store, Compass, User, MessageCircle, LogOut, LogIn, UserPlus,
  Smartphone, Car, Shirt, House, ShoppingBag, type LucideIcon,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useCategoryStore } from '@/store/categoryStore';

/**
 * The drawer is the Header's nav on small screens, so it mirrors the same
 * destinations. Pre-pivot entries (Sale, Featured, "Browse All Products") went
 * with the buying flows — Browse has no query params for them.
 */

// Same department→icon map the Header uses; the API carries no icon field.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  electronics: Smartphone,
  vehicles: Car,
  fashion: Shirt,
  'home-property': House,
};

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isMobileMenuOpen) {
      fetchCategories();
    }
  }, [isMobileMenuOpen, fetchCategories]);

  // Letting the body scroll behind an open sheet makes the page drift under it
  // on touch, so it is locked while the drawer is up.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobileMenu(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen, closeMobileMenu]);

  const handleLogout = async () => {
    await signOut();
    logout();
    closeMobileMenu();
  };

  // Only top-level departments get a row, matching the Header's chip rail.
  const topCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="ws">
      <div
        className={`ws-drawer__scrim${isMobileMenuOpen ? ' is-open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <aside
        className={`ws-drawer${isMobileMenuOpen ? ' is-open' : ''}`}
        aria-label="Menu"
        // Off-screen but still in the DOM, so its links stay tabbable without
        // this — inert takes them out of the tab order while closed.
        inert={!isMobileMenuOpen || undefined}
      >
        <div className="ws-drawer__head">
          <Link to="/" onClick={closeMobileMenu} className="ws-brand" aria-label="WorldShop home">
            <span className="ws-brand__eyebrow">Worldstreet</span>
            <span className="ws-brand__word">shop<span className="ws-brand__dot">.</span></span>
          </Link>
          <button className="ws-iconbtn" onClick={closeMobileMenu} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {isAuthenticated && (
          <div className="ws-listrow">
            <span className="ws-avatar ws-avatar--m">
              {user?.firstName ? user.firstName.charAt(0).toUpperCase() : <User size={16} />}
            </span>
            <div className="ws-listrow__body">
              <span className="ws-listrow__title">{user?.firstName ?? 'Your account'}</span>
              <span className="ws-listrow__sub">Signed in</span>
            </div>
          </div>
        )}

        <nav className="ws-drawer__nav">
          <Link to="/" className="ws-drawer__link" onClick={closeMobileMenu}>
            <Home size={18} aria-hidden />
            Home
          </Link>
          <Link to="/listings" className="ws-drawer__link" onClick={closeMobileMenu}>
            <ShoppingBag size={18} aria-hidden />
            Browse listings
          </Link>
          <a
            href="https://dashboard.worldstreetgold.com"
            className="ws-drawer__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Compass size={18} aria-hidden />
            WorldStreet dashboard
          </a>

          {topCategories.length > 0 && (
            <>
              <div className="ws-drawer__section">Categories</div>
              {topCategories.map((cat) => {
                const Icon = CATEGORY_ICON[cat.slug] ?? ShoppingBag;
                return (
                  <Link
                    key={cat.id}
                    to={`/listings?categoryId=${cat.id}`}
                    className="ws-drawer__link"
                    onClick={closeMobileMenu}
                  >
                    <Icon size={18} aria-hidden />
                    {cat.name}
                    {cat.productCount !== undefined && (
                      <span className="ws-drawer__count">{cat.productCount}</span>
                    )}
                  </Link>
                );
              })}
            </>
          )}

          <hr className="ws-hr" style={{ margin: 'var(--ws-space-2) 0' }} />

          {isAuthenticated ? (
            <>
              <Link to="/account" className="ws-drawer__link" onClick={closeMobileMenu}>
                <User size={18} aria-hidden />
                My account
              </Link>
              <Link to="/account/messages" className="ws-drawer__link" onClick={closeMobileMenu}>
                <MessageCircle size={18} aria-hidden />
                Messages
              </Link>
              <Link to="/vendor" className="ws-drawer__link" onClick={closeMobileMenu}>
                <Store size={18} aria-hidden />
                Sell on WorldStreet
              </Link>
              <button onClick={handleLogout} className="ws-drawer__link is-danger">
                <LogOut size={18} aria-hidden />
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="ws-drawer__link" onClick={closeMobileMenu}>
                <LogIn size={18} aria-hidden />
                Log in
              </Link>
              <Link to="/auth/register" className="ws-drawer__link" onClick={closeMobileMenu}>
                <UserPlus size={18} aria-hidden />
                Create account
              </Link>
            </>
          )}
        </nav>
      </aside>
    </div>
  );
}
