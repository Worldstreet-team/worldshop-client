import { NavLink, useLocation } from "react-router-dom";
import { Bookmark, Home, MessageCircle, Search, Store, ChevronsUpDown } from "lucide-react";
import { useUIStore } from "@/shared/store/uiStore";

/**
 * The floating navigation pill, as the design sandbox has it on small screens:
 * a rounded bar of icon buttons sitting above the bottom edge rather than
 * pinned flush to it.
 *
 * It replaces nothing — the header keeps the brand, search and notifications —
 * but on a phone the header cannot hold six destinations, and a bar at thumb
 * height is reachable where a top nav is not.
 *
 * The page reserves room for it through .ws-shell__main's tall mobile bottom
 * padding, so the pill never covers the last card.
 */

const ITEMS = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/listings", label: "Search", Icon: Search, end: false },
  { to: "/saved", label: "Saved", Icon: Bookmark, end: false },
  { to: "/vendor", label: "Sell", Icon: Store, end: false },
  { to: "/account/messages", label: "Inbox", Icon: MessageCircle, end: false },
];

export default function MobileNavPill() {
  const { toggleMobileMenu } = useUIStore();
  const location = useLocation();

  // The admin console and the seller dashboards have their own chrome; a
  // marketplace bar floating over them would be two navigations at once.
  if (/^\/(admin|vendor\/|mall\/)/.test(location.pathname)) return null;

  return (
    <div className="ws-navpill" role="navigation" aria-label="Main">
      <div className="ws-navpill__bar">
        {ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `ws-navpill__btn${isActive ? " is-active" : ""}`
            }
            title={label}
            aria-label={label}
          >
            <Icon size={20} aria-hidden />
          </NavLink>
        ))}

        <button
          type="button"
          className="ws-navpill__btn"
          onClick={toggleMobileMenu}
          title="More"
          aria-label="More"
        >
          <ChevronsUpDown size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
