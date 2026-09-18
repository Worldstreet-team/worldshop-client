import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import {
  X, Heart, Home, Store, Compass, User, MessageCircle, LogOut, LogIn, UserPlus, Building2,
  Smartphone, Car, Shirt, House, ShoppingBag, GraduationCap, Users, Zap, LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { useUIStore } from '@/shared/store/uiStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCategories } from '@/features/catalog/hooks/useCategories';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  electronics: Smartphone,
  vehicles: Car,
  fashion: Shirt,
  'home-property': House,
};

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { categories } = useCategories();
  const { signOut } = useClerk();
  const drawerRef = useRef<HTMLElement>(null);
  const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
    if (isMobileMenuOpen) {
      drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
      return () => {
        document.querySelector<HTMLElement>('.ws-topbar__menu')?.focus();
      };
    }
  }, [isMobileMenuOpen]);

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
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      logout();
      closeMobileMenu();
    } finally {
      setSigningOut(false);
    }
  };

   const topCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="ws">
      <div
        className={`ws-drawer__scrim${isMobileMenuOpen ? ' is-open' : ''}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className={`ws-drawer${isMobileMenuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
                      inert={!isMobileMenuOpen || undefined}
      >
        <div className="ws-drawer__head">
          <Link to="/" onClick={closeMobileMenu} className="ws-brand" aria-label="WorldStore home">

            <img src="/brand/wsa-mark.png" alt="" className="ws-brand__mark" />
            <span className="ws-brand__stack">
              <span className="ws-brand__word">WorldStore</span>
            </span>
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
          <Link to="/malls" className="ws-drawer__link" onClick={closeMobileMenu}>
            <Building2 size={18} aria-hidden />
            Malls
          </Link>
          <Link to="/saved" className="ws-drawer__link" onClick={closeMobileMenu}>
            <Heart size={18} aria-hidden />
            Saved listings
          </Link>

          <div className="ws-drawer__section">Ecosystem</div>
          <a
            href="https://dashboard.worldstreetgold.com"
            className="ws-drawer__link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobileMenu}
          >
            <Compass size={18} aria-hidden />
            Dashboard
          </a>
          <a
            href="https://academy.worldstreetgold.com"
            className="ws-drawer__link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobileMenu}
          >
            <GraduationCap size={18} aria-hidden />
            Academy
          </a>
          <a
            href="https://xtreme.worldstreetgold.com"
            className="ws-drawer__link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobileMenu}
          >
            <Zap size={18} aria-hidden />
            Xstream
          </a>
          <a
            href="https://social.worldstreetgold.com"
            className="ws-drawer__link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeMobileMenu}
          >
            <Users size={18} aria-hidden />
            Social
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
                Sell on WorldStore
              </Link>

              <Link to="/mall" className="ws-drawer__link" onClick={closeMobileMenu}>
                <Building2 size={18} aria-hidden />
                Open a mall
              </Link>

              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="ws-drawer__link" onClick={closeMobileMenu}>
                  <LayoutGrid size={18} aria-hidden />
                  Admin console
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="ws-drawer__link is-danger"
              >
                <LogOut size={18} aria-hidden />
                {signingOut ? 'Signing out…' : 'Log out'}
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
