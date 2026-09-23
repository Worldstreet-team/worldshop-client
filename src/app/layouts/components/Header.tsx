import { useState, useEffect, useSyncExternalStore } from "react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Menu,
  Moon,
  Store,
  Sun,
  User,
  LayoutGrid,
} from "lucide-react";
import { isLight, toggleTheme } from "@/shared/utils/theme";
import { savedListings } from "@/features/listings/savedListings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUIStore } from "@/shared/store/uiStore";
import { useUnreadCount } from "@/features/chat/hooks/useUnreadCount";
import { useTransparentHeader } from "@/shared/hooks/useTransparentHeader";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/listings", label: "Marketplace", end: false },
  { to: "/stores", label: "Stores", end: false },
  { to: "/malls", label: "Malls", end: false },
];

export default function Header() {
  const location = useLocation();
  const [params] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { toggleMobileMenu } = useUIStore();
  const urlSearch = params.get("search") ?? "";
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);
  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
  }
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileSearchOpen(false);
  }

  useEffect(() => {
    if (!mobileSearchOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileSearchOpen]);

  const [light, setLight] = useState(isLight);
  const savedCount = useSyncExternalStore(
    savedListings.subscribe,
    savedListings.count,
  );
  const unread = useUnreadCount(isAuthenticated);
  const overHero = useTransparentHeader(location.pathname === "/");

  return (
    <header className={`ws-topbar${overHero ? " ws-topbar--hero" : ""}`}>
      <div className="ws-wrap">
        <div className="ws-topbar__row">
          <Link to="/" className="ws-brand" aria-label="WorldStore home">
            <img src="/brand/wsa-mark.png" alt="" className="ws-brand__mark" />
            <span className="ws-brand__stack">
              <span className="ws-brand__word">WorldStore</span>
            </span>
          </Link>

          <nav className="ws-topbar__nav" aria-label="Main">
            {NAV.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className="ws-topbar__navlink">
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ws-topbar__actions">
            <div className="ws-topbar__group ws-topbar__group--utility">
              <button
                type="button"
                className="ws-iconbtn"
                onClick={() => setLight(toggleTheme() === "platform-light")}
                aria-label={
                  light ? "Switch to dark mode" : "Switch to light mode"
                }
                title={light ? "Dark mode" : "Light mode"}
              >
                {light ? <Moon size={18} /> : <Sun size={18} />}
              </button>

              {isAuthenticated && (
                <Link
                  to="/saved"
                  className="ws-iconbtn ws-topbar__saved"
                  aria-label={
                    savedCount
                      ? `Saved listings, ${savedCount} saved`
                      : "Saved listings"
                  }
                  title="Saved listings"
                >
                  <Heart size={18} />
                  {savedCount > 0 && <span className="ws-iconbtn__dot" />}
                </Link>
              )}

              {isAuthenticated && user?.role === "ADMIN" && (
                <Link
                  to="/admin"
                  className="ws-iconbtn ws-topbar__admin"
                  aria-label="Admin console"
                  title="Admin console"
                >
                  <LayoutGrid size={18} />
                </Link>
              )}
            </div>

            <div className="ws-topbar__group ws-topbar__group--account">
              <Link
                to="/vendor"
                className="ws-btn ws-btn--sm ws-btn--primary ws-topbar__sell"
              >
                <Store size={16} aria-hidden />
                {isAuthenticated ? "My store" : "Sell"}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/account/messages"
                  className="ws-iconbtn"
                  aria-label={
                    unread ? `Messages, ${unread} unread` : "Messages"
                  }
                  title="Messages"
                >
                  <MessageCircle size={20} />
                  {unread > 0 && <span className="ws-iconbtn__dot" />}
                </Link>
              )}

              <Link
                to="/account"
                className="ws-avatar ws-avatar--m ws-topbar__profile"
                aria-label={isAuthenticated ? "Your account" : "Sign in"}
                title={isAuthenticated ? "Your account" : "Sign in"}
              >
                {isAuthenticated && user?.firstName ? (
                  user.firstName.charAt(0).toUpperCase()
                ) : (
                  <User size={16} aria-hidden />
                )}
              </Link>
            </div>
          </div>

          <button
            className="ws-iconbtn ws-topbar__menu"
            onClick={toggleMobileMenu}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
