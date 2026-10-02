import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  Bookmark,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  MapPin,
  Menu,
  Plus,
  Search,
  Store,
  User,
} from "lucide-react";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import CategoryMenu from "@/app/layouts/components/CategoryMenu";
import { departmentIcon, OUTLINED } from "@/features/catalog/departmentIcons";
import { departmentsWithStock } from "@/features/catalog/categoryTree";
import { savedListings } from "@/features/listings/savedListings";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCurrentPlace } from "@/shared/hooks/useCurrentPlace";
import { useUIStore } from "@/shared/store/uiStore";
import { useUnreadCount } from "@/features/chat/hooks/useUnreadCount";

/**
 * Which ends of a horizontally scrolling row have more to reveal. Measured
 * from observer and scroll callbacks only: a ResizeObserver reports once as
 * soon as it starts observing, so there is no first read to do by hand.
 */
function useScrollEdges<T extends HTMLElement>(contentKey: unknown) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const start = el.scrollLeft > 1;
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [contentKey]);

  return [ref, edges] as const;
}


/** Placeholder pill widths, roughly the spread of real department names. */
const SKELETON_PILLS = [104, 86, 122, 94, 138, 110, 80, 126];

// Display only for now: the API has no distance filter, so the radius is not
// sent anywhere. The place is the buyer's own state when the browser shares
// it (useCurrentPlace), Lagos until then.
const radiusOptions = (place: string) => [
  { value: "near-5", label: `${place} · 5 km` },
  { value: "near-10", label: `${place} · 10 km` },
  { value: "near-25", label: `${place} · 25 km` },
  { value: "ng", label: "Anywhere in Nigeria" },
];

export default function Header() {
  const location = useLocation();
  const [params] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const place = useCurrentPlace();
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
  // Departments that hold something, biggest first. An empty category in the
  // nav costs a tap to discover and teaches buyers the bar cannot be trusted.
  const departments = departmentsWithStock(categories).slice(0, 10);
  // Re-measured when the pills change, since that changes the row's scroll
  // width without changing its own box.
  const [catRow, catEdges] = useScrollEdges<HTMLDivElement>(
    categoriesLoading ? "loading" : departments.length,
  );
  const nudgeCats = (direction: 1 | -1) => {
    const el = catRow.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.6, behavior: reduced ? "auto" : "smooth" });
  };

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
            <img src="/brand/wsa-tile.png" alt="" width={28} height={28} />
            <span className="ws-brandmark__word">WorldStore</span>
            <span className="ws-brandmark__chip">Marketplace</span>
          </Link>

          <div className="ws-topbar__centre">
            <label className="ws-hfield ws-hfield--location">
              <MapPin size={16} fill="currentColor" aria-hidden />
              <span className="ws-sr-only">Location and radius</span>
              <select className="ws-hfield__select" defaultValue="near-10">
                {radiusOptions(place ?? "Lagos").map((r) => (
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
                <LayoutGrid size={16} fill="currentColor" aria-hidden />
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
                <Bell size={18} fill="currentColor" aria-hidden />
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
                <Bookmark size={18} fill="currentColor" aria-hidden />
              </Link>
            )}

            <Link to="/vendor/listings/new" className="ws-createbtn">
              <Plus size={16} aria-hidden />
              Create listing
            </Link>

            <Link to="/account" className="ws-acct" aria-label={isAuthenticated ? "Your account" : "Sign in"}>
              <span className="ws-acct__avatar">
                {isAuthenticated && user?.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : isAuthenticated && user?.firstName ? (
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
            <div className="ws-catbar__scroller">
              <div className="ws-catbar__row" ref={catRow} role="group" aria-label="Browse categories">
                <Link to="/categories" className="ws-pill">
                  <LayoutGrid size={14} fill="currentColor" aria-hidden />
                  All categories
                </Link>
                {/* Stores and Malls lead the bar rather than sitting among the
                    departments: they are different kinds of destination, and the
                    bar is the only nav this header has left. */}
                <Link to="/stores" className="ws-pill ws-pill--place">
                  <Store size={14} fill="currentColor" aria-hidden />
                  Stores
                </Link>
                <Link to="/malls" className="ws-pill ws-pill--place">
                  <Building2 size={14} fill="currentColor" aria-hidden />
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
                        <Link key={c.id} to={`/categories/${c.slug}`} className="ws-pill">
                          <Icon size={14} fill={OUTLINED.has(Icon) ? "none" : "currentColor"} aria-hidden />
                          {c.name}
                        </Link>
                      );
                    })}
              </div>
              {catEdges.start && (
                <div className="ws-catbar__edge ws-catbar__edge--start">
                  <button
                    type="button"
                    className="ws-catbar__nudge"
                    onClick={() => nudgeCats(-1)}
                    aria-label="Scroll categories back"
                  >
                    <ChevronLeft size={14} aria-hidden />
                  </button>
                </div>
              )}
              {catEdges.end && (
                <div className="ws-catbar__edge ws-catbar__edge--end">
                  <button
                    type="button"
                    className="ws-catbar__nudge"
                    onClick={() => nudgeCats(1)}
                    aria-label="Scroll categories forward"
                  >
                    <ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
