import { useState, useEffect, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  Heart,
  MapPin,
  MessageCircle,
  Menu,
  Search,
  Store,
  User,
  LayoutGrid,
} from "lucide-react";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { savedListings } from "@/features/listings/savedListings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUIStore } from "@/shared/store/uiStore";
import { useUnreadCount } from "@/features/chat/hooks/useUnreadCount";

/**
 * Radius options as the sandbox lists them. Static for now: the API has no
 * location filter yet, so wiring it would mean inventing an endpoint.
 */
const RADIUS = [
  { value: "lagos-5", label: "Lagos · 5 km" },
  { value: "lagos-10", label: "Lagos · 10 km" },
  { value: "lagos-25", label: "Lagos · 25 km" },
  { value: "ng", label: "Anywhere in Nigeria" },
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
  const savedCount = useSyncExternalStore(
    savedListings.subscribe,
    savedListings.count,
  );
  const unread = useUnreadCount(isAuthenticated);
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [term, setTerm] = useState(urlSearch);
  // Departments only: the pill row is a shortcut into a section, not the full
  // tree, and the sandbox shows ten before the row starts scrolling.
  const departments = categories.filter((c) => !c.parentId).slice(0, 10);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    navigate(q ? `/listings?search=${encodeURIComponent(q)}` : "/listings");
  };

  return (
    <header className="ws-topbar">
      <div className="ws-wrap">
        <div className="ws-topbar__row">
          <Link to="/" className="ws-brand" aria-label="WorldStore home">
            <img src="/brand/wstore-mark.svg" alt="" className="ws-brand__mark" width={32} height={32} />
            <span className="ws-brand__stack">
              <span className="ws-brand__word">WorldStore</span>
            </span>
          </Link>

          <div className="ws-topbar__centre">
            <label className="ws-field ws-field--location">
              <MapPin size={16} aria-hidden />
              <span className="ws-sr-only">Location and radius</span>
              <select className="ws-field__select" defaultValue="lagos-10">
                {RADIUS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden className="ws-field__chev" />
            </label>

            <Link to="/listings" className="ws-field ws-field--cats">
              <LayoutGrid size={16} aria-hidden />
              All categories
              <ChevronDown size={14} aria-hidden className="ws-field__chev" />
            </Link>

            <form className="ws-field ws-field--search" onSubmit={submitSearch} role="search">
              <Search size={18} aria-hidden />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search listings, sellers, stores…"
                aria-label="Search listings"
              />
            </form>
          </div>

          <div className="ws-topbar__actions">
            <div className="ws-topbar__group ws-topbar__group--utility">
              {/* The light/dark toggle is out while the market theme is the only
                  palette: it switches to "platform-light", which would drop the
                  user onto the old paper theme. Restore it, with its Sun/Moon
                  imports and `light` state, once market has a dark mode. */}

              {isAuthenticated && (
                <Link
                  to="/saved"
                  className="ws-iconbtn"
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

      {/* Department shortcuts, sticky under the header row. A scrolling row
          rather than a wrap, so the bar keeps its height on every screen. */}
      {departments.length > 0 && (
        <div className="ws-catbar">
          <div className="ws-wrap">
            <div className="ws-catbar__row" role="group" aria-label="Browse categories">
              <Link to="/listings" className="ws-pill">
                <LayoutGrid size={14} aria-hidden />
                All categories
              </Link>
              {departments.map((c) => (
                <Link key={c.id} to={`/listings?categoryId=${c.id}`} className="ws-pill">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
