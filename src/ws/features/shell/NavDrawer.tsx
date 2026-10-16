"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { ListRightIcon, XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";

/* The menu drawer for phones and tablets (spec §3.1: utility items move into the
   drawer; §16.6: native dialog, focus trapped, Escape closes, focus returns to the
   menu button). The buttons use invoker commands (commandfor/command), so the browser
   opens and closes it even before scripts have loaded on a slow phone; the click
   handlers cover browsers without them. It closes itself after navigating. */

/** Invoker Commands attributes, which React's types don't list yet. */
const command = (id: string, action: "show-modal" | "close") => ({ commandfor: id, command: action }) as Record<string, string>;
export function NavDrawer({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const pathname = usePathname();
  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal();
  };

  // Close after navigating, but not on first mount: a drawer opened before scripts
  // loaded (invoker command) must stay open.
  const shownFor = useRef(pathname);
  useEffect(() => {
    if (shownFor.current === pathname) return;
    shownFor.current = pathname;
    dialog.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-header__menu" })}
        aria-label="Menu"
        aria-haspopup="dialog"
        {...command(id, "show-modal")}
        onClick={open}
      >
        <ListRightIcon />
      </button>
      <dialog
        ref={dialog}
        id={id}
        className="ws-drawer"
        aria-label="Menu"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className="ws-drawer__panel">
          <div className="ws-drawer__head">
            <p className="ws-drawer__title">Menu</p>
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Close menu" {...command(id, "close")} onClick={() => dialog.current?.close()}>
              <XmarkCircleIcon />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

/** A drawer link that closes the drawer even when it points at the current page. */
export function DrawerLink({ href, icon, children }: { href: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="ws-drawer__link" onClick={(e) => e.currentTarget.closest("dialog")?.close()}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}
