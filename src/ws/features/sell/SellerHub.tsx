"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpGraphIncreaseIcon, CheckCircleIcon, DialIcon, GridIcon, HandshakeAgreementDealIcon, PackageIcon, PencilEditIcon, PlusCircleIcon, StoreIcon, TagIcon, TrashIcon, WalletIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { requireAuth, useSession } from "@ws/features/auth/session";
import { formatCurrency, kobo } from "@ws/lib/money";
import { canPublish, newDraft, STEPS, type SellerAccount } from "./model";
import { updateSeller, useHydrated, useSeller } from "./store";

const NAV = [
  { href: "/vendor", label: "Overview", icon: GridIcon },
  { href: "/vendor/listings", label: "Listings", icon: TagIcon },
  { href: "/vendor/orders", label: "Orders", icon: PackageIcon },
  { href: "/offers?as=seller", label: "Offers", icon: HandshakeAgreementDealIcon },
  { href: "/vendor/payouts", label: "Payouts", icon: WalletIcon },
  { href: "/vendor/performance", label: "Performance", icon: ArrowUpGraphIncreaseIcon },
  ...(rules.flags.analytics ? [{ href: "/vendor/analytics", label: "Analytics", icon: DialIcon }] : []),
  { href: "/sell/new", label: "Create listing", icon: PlusCircleIcon },
  { href: "/sell/start", label: "Shop setup", icon: StoreIcon },
];

/** SellerShell (Phase 7): the Seller Hub's sidebar on desktop, a scrolling tab row on phones. */
export function SellerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const activeLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  return <div className="ws-seller-shell">
    <nav aria-label="Seller Hub" className="ws-seller-nav"><p className="ws-sell-eyebrow">Seller Hub</p><ul>{NAV.map(({ href, label, icon: Icon }) =>
      {
        const navPath = href.split("?")[0];
        const current = path === navPath || (path === "/vendor/import" && navPath === "/vendor/listings");
        return <li key={href}><Link ref={current ? activeLink : undefined} href={href} aria-current={current ? "page" : undefined}><Icon />{label}</Link></li>;
      })}</ul></nav>
    <div className="ws-seller-main">{children}</div>
  </div>;
}

const when = (at: number) => new Date(at).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

export function SellerHub() {
  const account = useSeller();
  const hydrated = useHydrated();
  const { signedIn } = useSession();
  if (!hydrated) return <p className="ws-sell-loading" role="status">Loading…</p>;
  if (!signedIn) return <section className="ws-sell-empty"><StoreIcon /><h1>Seller Hub</h1><p>Sign in to manage your shop, drafts and listings.</p><button type="button" className={buttonClass({})} onClick={() => requireAuth("open Seller Hub", () => {})}>Sign in</button></section>;
  const tasks = [
    { done: !!account.profile, label: "Set up your shop", href: "/sell/start" },
    { done: account.kyc.status === "approved", label: account.kyc.status === "in_review" ? "Identity check in review" : account.kyc.status === "approved" ? "Identity verified" : "Verify your identity", href: "/sell/start" },
    { done: !!account.payout && !!account.agreed_at, label: "Add a payout account and accept the agreement", href: "/sell/start" },
    { done: account.listings.length > 0, label: "Create your first listing", href: "/sell/new" },
  ];
  return <div className="ws-hub">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub</p><h1>{account.profile ? account.profile.shop_name : "Your shop"}</h1>{account.profile && <p>@{account.profile.handle}</p>}</div>
      <Link className={buttonClass({})} href="/sell/new"><PlusCircleIcon />Create listing</Link></header>
    {account.suspended_reason && <div role="alert" className="ws-sell-alert"><strong>Your shop is suspended</strong><p>{account.suspended_reason} Your listings are hidden and you can’t publish. You can appeal within {rules.disputes.appealDays} days by contacting support.</p></div>}
    {account.payout_hold_reason && <div role="alert" className="ws-sell-alert"><strong>Payouts are on hold</strong><p>{account.payout_hold_reason} Orders still complete; withdrawals resume once the hold is lifted.</p></div>}
    {account.drafts.some((d) => d.admin_note) && <p className="ws-sell-tip"><WarningIcon />WorldStore asked for changes to a listing. It’s in your drafts below.</p>}
    {tasks.some((t) => !t.done) && <section className="ws-sell-card" aria-labelledby="tasks"><h2 id="tasks">Get ready to sell</h2><ol className="ws-tasks">{tasks.map((t) => <li key={t.label} data-done={t.done || undefined}>
      <CheckCircleIcon />{t.done ? <span>{t.label}<span className="cx-sr-only"> (done)</span></span> : <Link href={t.href}>{t.label}</Link>}</li>)}</ol>
      {!canPublish(account) && <p className="ws-form-field__hint">You can write drafts now. Publishing opens once you’re verified and have a payout account.</p>}</section>}
    <Drafts account={account} />
    <section className="ws-sell-card" aria-labelledby="live"><h2 id="live">Listings ({account.listings.length})</h2>
      {account.listings.length ? <ul className="ws-hub-rows">{account.listings.map((l) => <li key={l.id}>
        
        <img src={l.photos[0].url} alt="" width={56} height={56} />
        <span className="ws-hub-rows__main"><strong>{l.title}</strong><small>{formatCurrency(kobo(l.price_minor ?? 0))} · {l.qty} available · listed {when(l.published_at)}</small></span>
        <span className="ws-hub-status" data-status={l.status}>{l.status === "live" ? "Live" : "In review"}</span>
      </li>)}</ul> : <p className="ws-form-field__hint">Nothing published yet. Your first listing takes about 4 minutes.</p>}
    </section>
    <p className="ws-sell-demo">Demo workspace · Your shop, drafts and listings stay on this device. Buyers, couriers and payments are simulated.</p>
  </div>;
}

function Drafts({ account }: { account: SellerAccount }) {
  if (!account.drafts.length) return null;
  const drafts = [...account.drafts].sort((a, b) => b.updated_at - a.updated_at);
  return <section className="ws-sell-card" aria-labelledby="drafts"><h2 id="drafts">Drafts ({drafts.length})</h2><ul className="ws-hub-rows">{drafts.map((d) => <li key={d.id}>
    
    {d.photos[0] ? <img src={d.photos[0].url} alt="" width={56} height={56} /> : <span className="ws-hub-rows__thumb"><PencilEditIcon /></span>}
    <span className="ws-hub-rows__main"><strong>{d.title.trim() || "Untitled draft"}</strong><small>Step {d.step} of {STEPS.length}: {STEPS[d.step - 1]} · saved {when(d.updated_at)}</small></span>
    <span className="ws-hub-rows__actions"><Link className={buttonClass({ variant: "ghost", size: "sm" })} href={`/sell/${d.id}`}>Continue</Link>
      <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label={`Delete draft ${d.title.trim() || "Untitled draft"}`} onClick={() => updateSeller((a) => ({ ...a, drafts: a.drafts.filter((x) => x.id !== d.id) }))}><TrashIcon /></button></span>
  </li>)}</ul></section>;
}

const isBlank = (d: SellerAccount["drafts"][number]) => !d.photos.length && !d.title && !d.category_id && d.price_minor === null;

/** `/sell/new`: reuses an untouched draft or starts one, then continues at `/sell/:draftId` (R-100: no KYC needed). */
export function NewListing() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { signedIn } = useSession();
  const started = useRef(false);
  useEffect(() => {
    if (!hydrated || started.current) return;
    const create = () => {
      started.current = true;
      let id = "";
      try {
        updateSeller((a) => {
          const blank = a.drafts.find(isBlank);
          if (blank) { id = blank.id; return a; }
          id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
          return { ...a, drafts: [...a.drafts, newDraft(id, Date.now())] };
        });
        router.replace(`/sell/${id}`);
      } catch { started.current = false; }
    };
    if (signedIn) create();
  }, [hydrated, signedIn, router]);
  if (hydrated && !signedIn) return <section className="ws-sell-empty"><PencilEditIcon /><h1>Create a listing</h1><p>Photos, details, price and delivery in a few steps, saved as you go. Sign in to start.</p><button type="button" className={buttonClass({})} onClick={() => requireAuth("create a listing", () => {})}>Sign in</button></section>;
  return <p className="ws-sell-loading" role="status">Starting your listing…</p>;
}
