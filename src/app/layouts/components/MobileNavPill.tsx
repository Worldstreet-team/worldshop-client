import { useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bookmark, ChevronsUpDown, Home, MessageCircle, Search, Store } from "lucide-react";
import ModuleSwitcher from "@/app/layouts/components/ModuleSwitcher";

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
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // The admin console and the seller dashboards have their own chrome; a
  // marketplace bar floating over them would be two navigations at once.
  if (/^\/(admin|vendor\/|mall\/)/.test(location.pathname)) return null;

  return (
    <>
      {switcherOpen && <ModuleSwitcher toggleRef={toggleRef} onClose={() => setSwitcherOpen(false)} />}
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
          ref={toggleRef}
          type="button"
          className={`ws-navpill__btn${switcherOpen ? " is-active" : ""}`}
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={switcherOpen}
          title={switcherOpen ? "Close module switcher" : "Switch module"}
          aria-label={switcherOpen ? "Close module switcher" : "More, switch module"}
        >
          <ChevronsUpDown size={20} aria-hidden />
        </button>
        </div>
      </div>
    </>
  );
}
