import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  ChevronRight,
  Heart,
  Home,
  Store,
  User,
  MessageCircle,
  LogOut,
  LogIn,
  Building2,
  ShoppingBag,
  LayoutGrid,
} from "lucide-react";
import { useUIStore } from "@/shared/store/uiStore";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const { isAuthenticated, user, logout } = useAuth();
  const drawerRef = useRef<HTMLElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (isMobileMenuOpen) {
      drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
      return () => {
        document.querySelector<HTMLElement>(".ws-topbar__menu")?.focus();
      };
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileMenuOpen, closeMobileMenu]);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      closeMobileMenu();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="ws">
      <div
        className={`ws-drawer__scrim${isMobileMenuOpen ? " is-open" : ""}`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <aside
        ref={drawerRef}
        className={`ws-drawer${isMobileMenuOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!isMobileMenuOpen || undefined}
      >
        <div className="ws-drawer__head">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="ws-brand"
            aria-label="WorldStore home"
          >
            <img src="/brand/wsa-mark.png" alt="" className="ws-brand__mark" />
            <span className="ws-brand__stack">
              <span className="ws-brand__word">WorldStore</span>
            </span>
          </Link>
          <button
            className="ws-iconbtn"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <Link
          to={isAuthenticated ? "/account" : "/auth/login"}
          className="ws-listrow ws-listrow--link"
          onClick={closeMobileMenu}
        >
          <span className="ws-avatar ws-avatar--m">
            {isAuthenticated && user?.firstName ? (
              user.firstName.charAt(0).toUpperCase()
            ) : (
              <User size={16} aria-hidden />
            )}
          </span>
          <span className="ws-listrow__body">
            <span className="ws-listrow__title">
              {isAuthenticated ? displayName || "Your account" : "Sign in"}
            </span>
            <span className="ws-listrow__sub">
              {isAuthenticated
                ? user?.email || "View your profile"
                : "Save listings and message sellers"}
            </span>
          </span>
          <ChevronRight size={18} aria-hidden className="ws-drawer__chevron" />
        </Link>

        <nav className="ws-drawer__nav">
          <Link to="/" className="ws-drawer__link" onClick={closeMobileMenu}>
            <Home size={18} aria-hidden />
            Home
          </Link>
          <Link
            to="/listings"
            className="ws-drawer__link"
            onClick={closeMobileMenu}
          >
            <ShoppingBag size={18} aria-hidden />
            Marketplace
          </Link>
          <Link
            to="/stores"
            className="ws-drawer__link"
            onClick={closeMobileMenu}
          >
            <Store size={18} aria-hidden />
            Stores
          </Link>
          <Link
            to="/malls"
            className="ws-drawer__link"
            onClick={closeMobileMenu}
          >
            <Building2 size={18} aria-hidden />
            Malls
          </Link>
          {isAuthenticated && (
            <Link
              to="/saved"
              className="ws-drawer__link"
              onClick={closeMobileMenu}
            >
              <Heart size={18} aria-hidden />
              Saved listings
            </Link>
          )}

          <hr className="ws-hr" style={{ margin: "var(--ws-space-2) 0" }} />

          {isAuthenticated ? (
            <>
              <Link
                to="/account"
                className="ws-drawer__link"
                onClick={closeMobileMenu}
              >
                <User size={18} aria-hidden />
                My account
              </Link>
              <Link
                to="/account/messages"
                className="ws-drawer__link"
                onClick={closeMobileMenu}
              >
                <MessageCircle size={18} aria-hidden />
                Messages
              </Link>
              <Link
                to="/vendor"
                className="ws-drawer__link"
                onClick={closeMobileMenu}
              >
                <Store size={18} aria-hidden />
                Sell on WorldStore
              </Link>

              <Link
                to="/mall"
                className="ws-drawer__link"
                onClick={closeMobileMenu}
              >
                <Building2 size={18} aria-hidden />
                Open a mall
              </Link>

              {user?.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="ws-drawer__link"
                  onClick={closeMobileMenu}
                >
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
                {signingOut ? "Signing out…" : "Log out"}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="ws-drawer__link"
                onClick={closeMobileMenu}
              >
                <LogIn size={18} aria-hidden />
                Sign in
              </Link>
            </>
          )}
        </nav>
      </aside>
    </div>
  );
}
