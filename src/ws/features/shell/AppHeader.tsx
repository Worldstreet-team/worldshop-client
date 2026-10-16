import Link from "next/link";
import { BellIcon, ChatDotsIcon, HandshakeAgreementDealIcon, HeartIcon, HomeIcon, InfoCircleIcon, PlusCircleIcon, StoreIcon, TagIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { AccountMenu, Greeting } from "./AccountMenu";
import { HeaderFrame } from "./HeaderFrame";
import { HeaderSearch } from "./HeaderSearch";
import { Logo } from "./Logo";
import { DrawerLink, NavDrawer } from "./NavDrawer";
import { NotificationBell } from "./NotificationBell";

/*
 * AppHeader (spec §3.1, eBay's two-row header):
 * - ≥ 1200: a utility row (greeting, Deals, Help & Contact · Sell, Saved, My
 *   WorldStore, bell) over the main row (logo, Shop by category, search, watchlist).
 * - 768–1199: one row (menu, logo, search, bell, watchlist).
 * - Phones: menu, logo and watchlist, with the search on its own row underneath.
 * It's sticky with a negative top, so on scroll the utility row (desktop) or the logo
 * row (phones) slides away and the search stays: the "shrink" without a layout jump.
 * Utility links move into the menu drawer below 1200.
 */

type Props = {
  trending: readonly string[];
  /** Categories for the search box's scope select. */
  scopes?: readonly { id: string; name: string }[];
  categories?: React.ReactNode;
  categoryLinks?: React.ReactNode;
};

export function AppHeader({ trending, scopes, categories, categoryLinks }: Props) {
  return (
    <HeaderFrame>
      <div className="ws-utility">
        <div className="cx-container ws-utility__row">
          <div className="ws-utility__group">
            <Greeting />
            <Link href="/search?sort=discount">Deals</Link>
            <Link href="/help">Help &amp; Contact</Link>
          </div>
          <div className="ws-utility__group">
            <Link href="/sell/new">Sell</Link>
            <Link href="/saved">Saved</Link>
            <AccountMenu />
            <NotificationBell />
          </div>
        </div>
      </div>

      <div className="cx-container ws-header__main">
        <div className="ws-header__start">
          <NavDrawer>
            <div className="ws-drawer__hi">
              <Greeting />
            </div>
            <nav aria-label="Menu" className="ws-drawer__nav">
              <DrawerLink href="/" icon={<HomeIcon />}>Home</DrawerLink>
              <DrawerLink href="/search?sort=discount" icon={<TagIcon />}>Deals</DrawerLink>
              <DrawerLink href="/saved" icon={<HeartIcon />}>Saved</DrawerLink>
              <DrawerLink href="/notifications" icon={<BellIcon />}>Notifications</DrawerLink>
              <DrawerLink href="/inbox" icon={<ChatDotsIcon />}>Inbox</DrawerLink>
              <DrawerLink href="/offers" icon={<HandshakeAgreementDealIcon />}>Offers</DrawerLink>
              <DrawerLink href="/sell/new" icon={<PlusCircleIcon />}>Sell an item</DrawerLink>
              <DrawerLink href="/vendor" icon={<StoreIcon />}>Seller Hub</DrawerLink>
              <DrawerLink href="/help" icon={<InfoCircleIcon />}>Help &amp; Contact</DrawerLink>
            </nav>
            {categoryLinks}
          </NavDrawer>
          <Logo />
        </div>
        {categories && <div className="ws-header__cats">{categories}</div>}
        <div className="ws-header__search">
          <HeaderSearch trending={trending} scopes={scopes} />
        </div>
        <div className="ws-header__actions">
          <span className="ws-header__bell">
            <NotificationBell />
          </span>
          {/* P2P: no cart (owner's direction, 7 Oct). The watchlist takes its place. */}
          <Link href="/saved" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Watchlist">
            <HeartIcon />
          </Link>
        </div>
      </div>
    </HeaderFrame>
  );
}
