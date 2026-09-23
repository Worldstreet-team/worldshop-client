import { useState, useEffect, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  Bookmark,
  Car,
  Dumbbell,
  Gem,
  Home,
  Baby,
  Monitor,
  Plus,
  Shirt,
  Building2,
  Sparkles,
  Smartphone,
  Store,
  Tag,
  ChevronDown,
  MapPin,
  Menu,
  Search,
  User,
  LayoutGrid,
} from "lucide-react";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import CategoryMenu from "@/app/layouts/components/CategoryMenu";
import { savedListings } from "@/features/listings/savedListings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUIStore } from "@/shared/store/uiStore";
import { useUnreadCount } from "@/features/chat/hooks/useUnreadCount";

/**
 * Radius options as the sandbox lists them. Static for now: the API has no
 * location filter yet, so wiring it would mean inventing an endpoint.
 */
/** Department name to icon, as the sandbox pairs them. Tag is the fallback. */
export function departmentIcon(name: string) {
  const n = name.toLowerCase();
  if (/vehicle|car|auto/.test(n)) return Car;
  if (/phone|tablet|mobile/.test(n)) return Smartphone;
  if (/electronic|computer|laptop/.test(n)) return Monitor;
  if (/fashion|cloth|wear/.test(n)) return Shirt;
  if (/home|furniture|appliance/.test(n)) return Home;
  if (/sport|fitness|outdoor/.test(n)) return Dumbbell;
  if (/beauty|health|personal/.test(n)) return Sparkles;
  if (/propert|estate|land/.test(n)) return Building2;
  if (/jewel|watch/.test(n)) return Gem;
  if (/baby|kid|child/.test(n)) return Baby;
  return Tag;
}

/** Placeholder pill widths, roughly the spread of real department names. */
const SKELETON_PILLS = [104, 86, 122, 94, 138, 110, 80, 126];

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
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [term, setTerm] = useState(urlSearch);
  const [menuOpen, setMenuOpen] = useState(false);
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
          <Link to="/" className="ws-brandmark" aria-label="WorldStore home">
            <img src="/brand/wstore-mark.svg" alt="" width={28} height={28} />
            <span className="ws-brandmark__word">WorldStore</span>
            <span className="ws-brandmark__chip">Marketplace</span>
          </Link>

          <div className="ws-topbar__centre">
            <label className="ws-hfield ws-hfield--location">
              <MapPin size={16} aria-hidden />
              <span className="ws-sr-only">Location and radius</span>
              <select className="ws-hfield__select" defaultValue="lagos-10">
                {RADIUS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden className="ws-hfield__chev" />
            </label>

            {/* A button, not a link: it opens the tree in place. Browsing
                everything is still one click from the first row inside. */}
            <div className="ws-hfield__wrap">
              <button
                type="button"
                className={`ws-hfield ws-hfield--cats${menuOpen ? " is-open" : ""}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <LayoutGrid size={16} aria-hidden />
                All categories
                <ChevronDown size={14} aria-hidden className="ws-hfield__chev" />
              </button>
              {menuOpen && <CategoryMenu onClose={() => setMenuOpen(false)} />}
            </div>

            <form className="ws-hfield ws-hfield--search" onSubmit={submitSearch} role="search">
              <Search size={18} aria-hidden />
              <input
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search listings, sellers, stores…"
                aria-label="Search listings"
              />
              <kbd className="ws-kbd">⌘K</kbd>
            </form>
          </div>

          <div className="ws-topbar__actions">
            {isAuthenticated && (
              <Link
                to="/account/messages"
                className="ws-actionbtn"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Bell size={18} aria-hidden />
                {unread > 0 && (
                  <span className="ws-actionbtn__count">{unread > 99 ? "99+" : unread}</span>
                )}
              </Link>
            )}

            {isAuthenticated && (
              <Link
                to="/saved"
                className="ws-actionbtn"
                aria-label={savedCount ? `Saved listings, ${savedCount} saved` : "Saved listings"}
              >
                <Bookmark size={18} aria-hidden />
              </Link>
            )}

            {isAuthenticated && user?.role === "ADMIN" && (
              <Link to="/admin" className="ws-actionbtn" aria-label="Admin console">
                <LayoutGrid size={18} aria-hidden />
              </Link>
            )}

            <Link to="/vendor/listings/new" className="ws-createbtn">
              <Plus size={16} aria-hidden />
              Create listing
            </Link>

            <Link to="/account" className="ws-acct" aria-label={isAuthenticated ? "Your account" : "Sign in"}>
              <span className="ws-acct__avatar">
                {isAuthenticated && user?.firstName ? (
                  user.firstName.charAt(0).toUpperCase()
                ) : (
                  <User size={16} aria-hidden />
                )}
              </span>
              <span className="ws-acct__text">
                <span className="ws-acct__name">
                  {isAuthenticated && user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Sign in"}
                </span>
                <span className="ws-acct__handle">
                  {isAuthenticated && user?.email ? `@${user.email.split("@")[0]}` : "to your account"}
                </span>
              </span>
              <ChevronDown size={16} aria-hidden className="ws-acct__chev" />
            </Link>
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
      {/* The bar renders while categories load rather than appearing after
          them: it is 69px tall and sticky, so popping it in reflows everything
          below and moves the hero out from under the pointer. */}
      {(categoriesLoading || departments.length > 0) && (
        <div className="ws-catbar">
          <div className="ws-wrap">
            <div className="ws-catbar__row" role="group" aria-label="Browse categories">
              <Link to="/listings" className="ws-pill">
                <LayoutGrid size={14} aria-hidden />
                All categories
              </Link>
              {/* Stores and Malls lead the bar rather than sitting among the
                  departments: they are different kinds of destination, and the
                  bar is the only nav this header has left. */}
              <Link to="/stores" className="ws-pill ws-pill--place">
                <Store size={14} aria-hidden />
                Stores
              </Link>
              <Link to="/malls" className="ws-pill ws-pill--place">
                <Building2 size={14} aria-hidden />
                Malls
              </Link>
              {categoriesLoading
                ? // Widths vary so the row reads as words of different lengths
                  // rather than a progress bar chopped into pieces.
                  SKELETON_PILLS.map((w, i) => (
                    <span
                      key={i}
                      className="ws-pill ws-pill--skeleton"
                      style={{ width: w }}
                      aria-hidden
                    />
                  ))
                : departments.map((c) => {
                    const Icon = departmentIcon(c.name);
                    return (
                      <Link key={c.id} to={`/listings?categoryId=${c.id}`} className="ws-pill">
                        <Icon size={14} aria-hidden />
                        {c.name}
                      </Link>
                    );
                  })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
