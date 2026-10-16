"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ComponentType } from "react";
import { AccountIcon, ChatDotsIcon, HomeIcon, MagnifyingGlassIcon, PlusCircleIcon } from "@ws/components/icons";
import { useSession } from "@ws/features/auth/session";
import { cx } from "@ws/lib/cx";

/* BottomNav (spec §3.2): five tabs on phones, Home · Search · Sell · Inbox · Account,
   Sell raised in the centre. It slides away while scrolling down and comes back on the
   way up; pages keep bottom padding equal to its height (audit F17), safe areas
   included. The watchlist lives in the header and the Account tab (no cart: P2P).
   Signed-in only: every tab past Search needs an account, so a guest browses with the
   header alone, and the page's bottom room for the nav is released with it. */

type Tab = { href: string; label: string; icon: ComponentType; match: (path: string) => boolean; sell?: boolean };

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p) => p === "/" },
  { href: "/search", label: "Search", icon: MagnifyingGlassIcon, match: (p) => p.startsWith("/search") },
  { href: "/sell/new", label: "Sell", icon: PlusCircleIcon, match: (p) => p.startsWith("/sell"), sell: true },
  { href: "/inbox", label: "Inbox", icon: ChatDotsIcon, match: (p) => p.startsWith("/inbox") },
  { href: "/account", label: "Account", icon: AccountIcon, match: (p) => p.startsWith("/account") },
];

export function BottomNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const { signedIn } = useSession();

  // --cx-bottom-nav-h feeds every offset that clears the nav (page padding, sticky bars).
  useEffect(() => {
    const root = document.documentElement;
    if (signedIn) delete root.dataset.bottomnav;
    else root.dataset.bottomnav = "off";
  }, [signedIn]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) < 8) return;
        el.dataset.hidden = String(y > last && y > 120);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  // A new page starts with the nav showing.
  useEffect(() => {
    if (ref.current) ref.current.dataset.hidden = "false";
  }, [pathname]);

  // On a listing the sticky buy bar takes this place (spec §3.2).
  if (!signedIn || pathname.startsWith("/listing/")) return null;
  return (
    <nav ref={ref} aria-label="Main" className="ws-bottomnav" data-hidden="false">
      <ul>
        {TABS.map(({ href, label, icon: Icon, match, sell }) => {
          const current = match(pathname);
          return (
            <li key={href}>
              <Link href={href} className={cx("ws-bottomnav__tab", sell && "ws-bottomnav__tab--sell")} aria-current={current ? "page" : undefined}>
                <span className="ws-bottomnav__icon">
                  <Icon />
                </span>
                <span className="ws-bottomnav__label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
