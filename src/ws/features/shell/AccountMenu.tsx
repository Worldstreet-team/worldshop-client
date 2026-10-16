"use client";

import { AccountIcon, ArrowDownIcon } from "@ws/components/icons";
import { Menu, type MenuItem } from "@ws/components/ui";
import { requestSignIn as signIn, signOut, useSession } from "@ws/features/auth/session";

/* AccountMenu (spec §3.1, eBay "My eBay"): the places a buyer and seller come back to.
   Desktop only; phones use the Account tab. No Orders entry: nothing is bought on the platform. */

const PLACES: MenuItem[] = [
  { label: "Saved", href: "/saved" },
  { label: "Inbox", href: "/inbox" },
  { label: "Offers", href: "/offers" },
  { label: "Seller Hub", href: "/vendor" },
  { label: "Account settings", href: "/account" },
];

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { signedIn } = useSession();
  const items: (MenuItem | "separator")[] = signedIn
    ? [...PLACES, "separator", { label: "Sign out", onSelect: signOut }]
    : [{ label: "Sign in", onSelect: signIn }, "separator", ...PLACES];
  return compact ? (
    <Menu label="Your account" trigger={<AccountIcon />} items={items} />
  ) : (
    <Menu
      label="My WorldStore"
      iconOnly={false}
      trigger={
        <>
          My WorldStore
          <ArrowDownIcon />
        </>
      }
      items={items}
    />
  );
}

export function Greeting() {
  const { signedIn, firstName } = useSession();
  return signedIn ? (
    <span className="ws-utility__hi">Hi {firstName ?? "there"}!</span>
  ) : (
    <span className="ws-utility__hi">
      Hi!{" "}
      <button type="button" className="ws-utility__signin" onClick={signIn}>
        Sign in
      </button>{" "}
      or <a href="/auth/register">register</a>
    </span>
  );
}
