"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChatDotsIcon, CheckCircleIcon, DotsVerticalIcon, GridIcon, InfoCircleIcon, PackageIcon, PencilEditIcon, PlusCircleIcon, StarIcon, StoreIcon, TagIcon, TrashIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass, Menu, tabPanelProps, Tabs, toast } from "@ws/components/ui";
import type { DashboardAlert, Listing, ListingStatus, VendorDashboard } from "@/features/stores/api";
import { billingInterval } from "@/features/stores/model";
import { useLocalMoney } from "@/shared/hooks/useLocalMoney";
import { toApiError } from "@/shared/lib/api";
import { listingPath } from "@ws/lib/data/repo";
import { errorText, photoOf, priceOf, STATUS, useListingActions, useMyListings, useSubscriptionActions, useVendorDashboard, useWaiting } from "./live";

/*
 * Seller Hub (SellerHub.tsx, HubPages.tsx) on the store and listing APIs.
 *
 * The reference's Orders, Payouts and Performance pages are about escrow orders the
 * marketplace does not take, so they are not here. What the hub shows instead is what
 * a shop on WorldStore actually runs on: its subscription (which keeps it visible),
 * the WorldStreet dollar wallet that pays for it, listings, and buyers waiting on a
 * reply. Shop settings and reviews are the existing pages, inside this shell.
 */

const NAV = [
  { href: "/vendor", label: "Overview", icon: GridIcon },
  { href: "/vendor/listings", label: "Listings", icon: TagIcon },
  { href: "/inbox?as=seller", label: "Messages", icon: ChatDotsIcon },
  { href: "/vendor/reviews", label: "Reviews", icon: StarIcon },
  { href: "/sell/new", label: "Create listing", icon: PlusCircleIcon },
  { href: "/vendor/settings", label: "Shop settings", icon: StoreIcon },
];

/** SellerShell: the Seller Hub's sidebar on desktop, a scrolling tab row on phones. */
export function SellerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const activeLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);
  return (
    <div className="ws-seller-shell">
      <nav aria-label="Seller Hub" className="ws-seller-nav">
        <p className="ws-sell-eyebrow">Seller Hub</p>
        <ul>
          {NAV.map(({ href, label, icon: Icon }) => {
            const navPath = href.split("?")[0];
            const current = path === navPath;
            return (
              <li key={href}>
                <Link ref={current ? activeLink : undefined} href={href} aria-current={current ? "page" : undefined}>
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="ws-seller-main">{children}</div>
    </div>
  );
}

const DATE = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const when = (iso: string | null) => (iso ? DATE.format(new Date(iso)) : "");
const count = (n: number) => n.toLocaleString("en-NG");
const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;
const replyTime = (mins: number | null) => (mins == null ? null : mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${Math.round(mins / 1440)} days`);

function Thumb({ src }: { src: string }) {
  return src ? <img src={src} alt="" width={56} height={56} /> : (
    <span className="ws-hub-rows__thumb">
      <PackageIcon />
    </span>
  );
}

function Failed({ title, error, retry }: { title: string; error: unknown; retry: () => void }) {
  return (
    <section className="ws-sell-empty">
      <WarningIcon />
      <h1>{title}</h1>
      <p>{errorText(error, "Check your connection and try again.")}</p>
      <button type="button" className={buttonClass({})} onClick={retry}>
        Try again
      </button>
    </section>
  );
}

/* ---------- Overview ---------- */

export function SellerHub() {
  const { data, isPending, isError, error, refetch } = useVendorDashboard();
  const listings = useMyListings();
  const waiting = useWaiting();
  if (isPending) return <p className="ws-sell-loading" role="status">Loading your shop…</p>;
  if (isError || !data) return <Failed title="Seller Hub" error={error} retry={() => void refetch()} />;

  const rows = listings.data ?? [];
  const drafts = rows.filter((l) => l.status === "DRAFT").sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const top = rows.filter((l) => l.status === "PUBLISHED").sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  const sub = data.subscription;
  const live = data.store.publiclyVisible;
  const tasks = [
    { done: true, label: "Open your shop", href: "/vendor/settings" },
    { done: live || sub?.status === "ACTIVE", label: "Activate your subscription so buyers can see the shop", href: "#subscription" },
    { done: data.listings.total > 0, label: "Create your first listing", href: "/sell/new" },
    { done: data.listings.published > 0, label: "Publish a listing", href: "/vendor/listings?tab=DRAFT" },
  ];
  const reply = replyTime(data.engagement.avgResponseMins);

  return (
    <div className="ws-hub">
      <header className="ws-flow__head">
        <div>
          <p className="ws-sell-eyebrow">Seller Hub</p>
          <h1>{data.store.name}</h1>
          <p>
            {live ? "Visible to buyers" : data.store.status === "SUSPENDED" || data.store.status === "BANNED" ? "Hidden by WorldStore" : sub?.status === "LAPSED" ? "Hidden: subscription lapsed" : "Not visible to buyers yet"}
            {live && (
              <>
                {" · "}
                <Link href={`/seller/${data.store.slug}`}>View your shop</Link>
              </>
            )}
          </p>
        </div>
        <Link className={buttonClass({})} href="/sell/new">
          <PlusCircleIcon />
          Create listing
        </Link>
      </header>

      <Alerts data={data} />

      <section aria-label="Shop summary" className="ws-balances">
        <Tile label="Live listings" value={count(data.listings.published)} note={`${data.listings.draft} ${data.listings.draft === 1 ? "draft" : "drafts"}${data.listings.limit != null ? ` · plan allows ${data.listings.limit}` : ""}`} />
        <Tile label="Inquiries" value={count(data.engagement.inquiriesThisPeriod)} note={`Since ${when(data.engagement.since)}`} />
        <Tile label="Unread messages" value={count(data.inbox.unread)} note={reply ? `Usual reply time ${reply}` : `${data.inbox.openThreads} open conversations`} />
        <WalletTile data={data} />
      </section>

      {tasks.some((t) => !t.done) && (
        <section className="ws-sell-card" aria-labelledby="tasks">
          <h2 id="tasks">Get ready to sell</h2>
          <ol className="ws-tasks">
            {tasks.map((t) => (
              <li key={t.label} data-done={t.done || undefined}>
                <CheckCircleIcon />
                {t.done ? (
                  <span>
                    {t.label}
                    <span className="cx-sr-only"> (done)</span>
                  </span>
                ) : (
                  <Link href={t.href}>{t.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="ws-sell-card" aria-labelledby="drafts">
          <h2 id="drafts">Drafts ({drafts.length})</h2>
          <ul className="ws-hub-rows">
            {drafts.slice(0, 5).map((d) => (
              <li key={d.id}>
                <Thumb src={photoOf(d)} />
                <span className="ws-hub-rows__main">
                  <strong>{d.name.trim() || "Untitled draft"}</strong>
                  <small>
                    Saved {when(d.updatedAt)}
                    {d.compliance && !d.compliance.compliant && d.compliance.problems[0] ? ` · ${d.compliance.problems[0]}` : ""}
                  </small>
                </span>
                <span className="ws-hub-rows__actions">
                  <Link className={buttonClass({ variant: "ghost", size: "sm" })} href={`/sell/${d.id}`}>
                    Continue
                  </Link>
                </span>
              </li>
            ))}
          </ul>
          {drafts.length > 5 && (
            <Link className={buttonClass({ variant: "quiet", size: "sm" })} href="/vendor/listings?tab=DRAFT">
              All {drafts.length} drafts
            </Link>
          )}
        </section>
      )}

      <section className="ws-sell-card" aria-labelledby="top">
        <div className="ws-sell-card__head">
          <h2 id="top">Most viewed listings</h2>
          <Link className={buttonClass({ variant: "quiet", size: "sm" })} href="/vendor/listings">
            All listings
          </Link>
        </div>
        {top.length ? (
          <ul className="ws-hub-rows">
            {top.map((l) => (
              <li key={l.id}>
                <Thumb src={photoOf(l)} />
                <span className="ws-hub-rows__main">
                  <strong>{l.name}</strong>
                  <small>
                    {priceOf(l)} · {plural(l.viewCount, "view")} · {plural(l.inquiryCount, "inquiry", "inquiries")}
                  </small>
                </span>
                <Link className={buttonClass({ variant: "quiet", size: "sm", icon: true })} href={`/sell/${l.id}`} aria-label={`Edit ${l.name}`}>
                  <PencilEditIcon />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ws-form-field__hint">{listings.isPending ? "Loading listings…" : "Nothing is live yet. Publish a listing and its views show up here."}</p>
        )}
      </section>

      <section className="ws-sell-card" aria-labelledby="waiting">
        <h2 id="waiting">Buyers waiting on a reply</h2>
        {(waiting.data ?? []).length ? (
          <ul className="ws-hub-rows">
            {waiting.data!.map((c) => (
              <li key={c.id}>
                <Thumb src={c.listing ? photoOf(c.listing) : ""} />
                <span className="ws-hub-rows__main">
                  <strong>{c.listing?.name ?? "Listing removed"}</strong>
                  <small>
                    {c.buyer?.name ?? "A buyer"} · {c.unread} new
                  </small>
                </span>
                <Link className={buttonClass({ variant: "ghost", size: "sm" })} href={`/inbox/${c.id}`}>
                  Reply
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ws-form-field__hint">{waiting.isPending ? "Checking your inbox…" : "Nobody is waiting on you. Every conversation has an answer."}</p>
        )}
      </section>

      <Subscription data={data} />

      <section aria-labelledby="trust">
        <h2 id="trust" className="ws-sell-eyebrow">
          How buyers see you
        </h2>
        <div className="ws-balances">
          <Tile label="Response rate" value={data.engagement.responseRate != null ? `${Math.round(data.engagement.responseRate * 100)}%` : "—"} note="Conversations you answered" />
          <Tile label="Reply time" value={reply ?? "—"} note="Typical first reply" />
          <Tile label="Rating" value={data.reputation.reviewCount > 0 ? data.reputation.avgRating.toFixed(1) : "—"} note={`${count(data.reputation.reviewCount)} ${data.reputation.reviewCount === 1 ? "review" : "reviews"}`} />
          <Tile label="Listing views" value={count(data.engagement.views)} note="All live listings" />
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="ws-balance" data-key={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function WalletTile({ data }: { data: VendorDashboard }) {
  const { short, money } = useLocalMoney(data.store.country);
  const wallet = data.wallet;
  const due = wallet?.dueMinor ?? data.subscription?.plan.amountMinor ?? 0;
  return <Tile label="Wallet" value={wallet ? short(wallet.availableMinor) : "—"} note={wallet ? `${money(due)} due at renewal` : "Wallet unavailable right now"} tone={wallet?.sufficient ? "available" : undefined} />;
}

const ICON: Record<DashboardAlert["severity"], ReactNode> = { critical: <WarningIcon />, warning: <WarningIcon />, info: <InfoCircleIcon /> };

/** What needs doing, most urgent first, each with the one action that settles it. */
function Alerts({ data }: { data: VendorDashboard }) {
  const pay = usePay(data);
  if (!data.alerts.length) return null;
  return (
    <>
      {data.alerts.map((alert) => (
        <div key={alert.type} className={alert.severity === "critical" ? "ws-sell-alert" : "ws-sell-tip"} role={alert.severity === "critical" ? "alert" : "status"}>
          <p style={{ display: "flex", gap: "var(--cx-s-2)", margin: 0 }}>
            {ICON[alert.severity]}
            <span>{alert.message}</span>
          </p>
          {pay.needsPayment && ["ACTIVATE", "PAYMENT_FAILED", "EXPIRED"].includes(alert.type) && (
            <button type="button" className={buttonClass({ size: "sm" })} disabled={pay.busy} onClick={pay.activate}>
              {pay.busy ? "Processing…" : `Pay ${pay.dueShort}`}
            </button>
          )}
          {pay.canResume && alert.type === "CANCELLED" && (
            <button type="button" className={buttonClass({ size: "sm" })} disabled={pay.busy} onClick={pay.resume}>
              Turn auto-renew back on
            </button>
          )}
        </div>
      ))}
    </>
  );
}

/**
 * Activating charges the seller's real wallet, so the amount is stated and confirmed
 * first. A 402 is an expected answer, "top up", and is worded that way.
 */
function usePay(data: VendorDashboard) {
  const { money, short } = useLocalMoney(data.store.country);
  const actions = useSubscriptionActions();
  const sub = data.subscription;
  const wallet = data.wallet;
  const due = wallet?.dueMinor ?? sub?.plan.amountMinor ?? 0;
  // A cancelled subscription whose paid period is over needs paying too.
  const needsPayment = sub != null && (["PENDING_PAYMENT", "GRACE", "LAPSED"].includes(sub.status) || (sub.status === "CANCELLED" && !data.store.publiclyVisible));
  const canResume = sub?.status === "CANCELLED" && data.store.publiclyVisible;
  const until = sub?.currentPeriodEnd ? ` until ${when(sub.currentPeriodEnd)}` : "";

  const activate = () => {
    if (!sub) return;
    if (wallet && !wallet.sufficient) {
      toast({ tone: "loss", message: `Your wallet has ${money(wallet.availableMinor)} but ${money(due)} is due. Top up ${money(due - wallet.availableMinor)} and try again.` });
      return;
    }
    const balance = wallet ? ` Your balance is ${money(wallet.availableMinor)}.` : "";
    if (!window.confirm(`Charge ${money(due)} from your WorldStreet dollar wallet to keep your shop visible for one billing period (${sub.plan.name}, ${money(sub.plan.amountMinor)} ${billingInterval(sub.plan)})?${balance}`)) return;
    actions.charge.mutate(undefined, {
      onSuccess: (res) => toast({ tone: "gain", message: res.data.alreadyPaid ? "This period is already paid for." : "Your shop is now visible to buyers." }),
      onError: (err) => toast({ tone: "loss", message: toApiError(err, "").statusCode === 402 ? "Not enough balance in your dollar wallet. Top up and try again." : errorText(err, "Couldn't complete the payment.") }),
    });
  };
  // Stopping renewal is not a refund: the shop stays up to the end of the paid period.
  const cancel = () => {
    if (!window.confirm(`Stop auto-renewal? Your shop stays visible${until}, then goes offline. You can turn it back on any time before then.`)) return;
    actions.cancel.mutate(undefined, {
      onSuccess: () => toast({ message: `Auto-renewal stopped. Your shop stays visible${until}.` }),
      onError: (err) => toast({ tone: "loss", message: errorText(err, "Couldn't stop auto-renewal.") }),
    });
  };
  const resume = () =>
    actions.resume.mutate(undefined, {
      onSuccess: () => toast({ tone: "gain", message: "Auto-renewal is back on. Nothing is charged until your current period ends." }),
      onError: (err) => toast({ tone: "loss", message: errorText(err, "Couldn't turn auto-renewal back on.") }),
    });
  return { needsPayment, canResume, activate, cancel, resume, busy: actions.busy, dueShort: short(due), money };
}

function Subscription({ data }: { data: VendorDashboard }) {
  const pay = usePay(data);
  const sub = data.subscription;
  const { money } = pay;
  return (
    <section className="ws-sell-card" id="subscription" aria-labelledby="sub-title">
      <div className="ws-sell-card__head">
        <h2 id="sub-title">Subscription</h2>
        {sub && (
          <span className="ws-hub-status" data-status={sub.status === "ACTIVE" ? "live" : pay.canResume ? "ended" : "in_review"}>
            {sub.status === "ACTIVE" ? "On schedule" : pay.canResume ? `Ends ${when(sub.currentPeriodEnd)}` : sub.status === "LAPSED" ? "Lapsed" : "Payment due"}
          </span>
        )}
      </div>
      {sub ? (
        <>
          <dl className="ws-fees">
            <div>
              <dt>Plan</dt>
              <dd>
                {sub.plan.name}, {money(sub.plan.amountMinor)} {billingInterval(sub.plan)}
              </dd>
            </div>
            <div>
              <dt>{pay.canResume ? "Ends" : "Renews"}</dt>
              <dd>{sub.currentPeriodEnd ? when(sub.currentPeriodEnd) : "Not active yet"}</dd>
            </div>
            <div>
              <dt>Auto-renew</dt>
              <dd>{sub.autoRenew ? "On" : "Off"}</dd>
            </div>
            {sub.creditMinor > 0 && (
              <div>
                <dt>Shop credit</dt>
                <dd>{money(sub.creditMinor)}</dd>
              </div>
            )}
            {sub.lastCharge && (
              <div>
                <dt>Last payment</dt>
                <dd>{sub.lastCharge.status === "PAID" ? `$${(sub.lastCharge.amountMinor / 100).toFixed(2)} on ${when(sub.lastCharge.chargedAt)}` : "Failed"}</dd>
              </div>
            )}
          </dl>
          <p className="ws-form-field__hint">Charged in US dollars from your WorldStreet dollar wallet. Shop credit is used first.</p>
          <div className="ws-flow__actions">
            {pay.needsPayment && (
              <button type="button" className={buttonClass({ size: "sm" })} disabled={pay.busy} onClick={pay.activate}>
                {pay.busy ? "Processing…" : `Pay ${pay.dueShort}`}
              </button>
            )}
            {sub.status === "ACTIVE" && sub.autoRenew && (
              <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} disabled={pay.busy} onClick={pay.cancel}>
                Stop auto-renewal
              </button>
            )}
            {pay.canResume && (
              <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} disabled={pay.busy} onClick={pay.resume}>
                Turn auto-renew back on
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="ws-form-field__hint">No subscription yet. Your shop goes live once one is active.</p>
      )}
    </section>
  );
}

/* ---------- Listings ---------- */

const TABS = [
  { value: "PUBLISHED", label: "Live" },
  { value: "DRAFT", label: "Drafts" },
  { value: "HIDDEN", label: "Hidden" },
  { value: "REMOVED", label: "Removed" },
] as const satisfies readonly { value: ListingStatus; label: string }[];

export function ListingsPage({ initialTab }: { initialTab?: string }) {
  const { data, isPending, isError, error, refetch } = useMyListings();
  const [tab, setTab] = useState<ListingStatus>(TABS.some((t) => t.value === initialTab) ? (initialTab as ListingStatus) : "PUBLISHED");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const actions = useListingActions();

  if (isPending) return <p className="ws-sell-loading" role="status">Loading your listings…</p>;
  if (isError || !data) return <Failed title="Listings" error={error} retry={() => void refetch()} />;

  const q = query.trim().toLowerCase();
  const rows = data.filter((l) => l.status === tab && (!q || l.name.toLowerCase().includes(q)));
  const run = (label: string, p: Promise<{ message?: string }>) =>
    p.then(
      (res) => toast({ tone: "gain", message: res.message || label }),
      (err) => toast({ tone: "loss", message: errorText(err, "That didn't work. Try again.") }),
    );

  return (
    <div className="ws-hub">
      <header className="ws-flow__head">
        <div>
          <p className="ws-sell-eyebrow">Seller Hub</p>
          <h1>Listings</h1>
        </div>
        <Link className={buttonClass({})} href="/sell/new">
          <PlusCircleIcon />
          Create listing
        </Link>
      </header>
      <Tabs aria-label="Listing status" idBase="listings" items={TABS.map((t) => ({ value: t.value, label: `${t.label} (${data.filter((l) => l.status === t.value).length})` }))} value={tab} onChange={setTab} />
      <div {...tabPanelProps("listings", tab)}>
        <label className="ws-chat__search" style={{ marginBlockEnd: "var(--cx-s-3)" }}>
          <span className="cx-sr-only">Search your listings</span>
          <input type="search" className="ws-input" placeholder="Search your listings" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {rows.length ? (
          <table className="ws-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Price</th>
                <th scope="col">Views</th>
                <th scope="col">Inquiries</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="cx-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const problems = l.compliance && !l.compliance.compliant ? l.compliance.problems : [];
                return (
                  <tr key={l.id}>
                    <td className="ws-table__item">
                      {photoOf(l) ? <img src={photoOf(l)} alt="" width={48} height={48} className="ws-hub-thumb" /> : <span className="ws-hub-thumb"><PackageIcon /></span>}
                      <span>
                        <strong>{l.name || "Untitled draft"}</strong>
                        {problems.length > 0 && <small className="ws-table__note">{problems[0]}</small>}
                      </span>
                    </td>
                    <td data-label="Price">
                      {l.priceType === "FIXED" && l.status !== "REMOVED" ? (
                        <InlinePrice
                          label={`Price of ${l.name}`}
                          value={l.basePrice ?? 0}
                          onSave={(basePrice) => void run(`Saved the price of “${l.name}”`, actions.price.mutateAsync({ id: l.id, basePrice }))}
                        />
                      ) : (
                        priceOf(l)
                      )}
                    </td>
                    <td data-label="Views" className="ws-num">{count(l.viewCount)}</td>
                    <td data-label="Inquiries" className="ws-num">{count(l.inquiryCount)}</td>
                    <td data-label="Status">
                      <span className="ws-hub-status" data-status={STATUS[l.status].tone}>
                        {STATUS[l.status].label}
                      </span>
                    </td>
                    <td data-label="Updated">{when(l.updatedAt)}</td>
                    <td className="ws-table__actions">
                      <Menu
                        label={`Actions for ${l.name}`}
                        iconOnly
                        variant="quiet"
                        size="sm"
                        sheetTitle={l.name}
                        trigger={<DotsVerticalIcon />}
                        items={[
                          ...(l.status !== "REMOVED" ? [{ label: l.status === "DRAFT" ? "Continue editing" : "Edit", href: `/sell/${l.id}` }] : []),
                          ...(l.status === "PUBLISHED" ? [{ label: "View on WorldStore", href: listingPath({ id: l.id, slug: l.slug }) }] : []),
                          ...(l.status === "DRAFT" || l.status === "HIDDEN" ? [{ label: "Publish", onSelect: () => void run("Published", actions.publish.mutateAsync(l.id)) }] : []),
                          ...(l.status === "PUBLISHED" ? [{ label: "Hide from buyers", onSelect: () => void run("Hidden from buyers", actions.hide.mutateAsync(l.id)) }] : []),
                          "separator" as const,
                          { label: "Delete", danger: true, onSelect: () => setDeleting(l) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <section className="ws-order-empty">
            <PackageIcon />
            <h2>{q ? "No listings match" : `No ${TABS.find((t) => t.value === tab)!.label.toLowerCase()} listings`}</h2>
            {tab !== "REMOVED" && !q && (
              <Link className={buttonClass({ variant: "ghost" })} href="/sell/new">
                Create a listing
              </Link>
            )}
          </section>
        )}
        {tab === "REMOVED" && rows.length > 0 && <p className="ws-form-field__hint">WorldStore removed these for breaking the listing rules. Contact support if you think one was removed by mistake.</p>}
      </div>
      {deleting && (
        <Dialog title="Delete this listing?" close={() => setDeleting(null)}>
          <p>“{deleting.name || "Untitled draft"}” is deleted for good, with its photos. Conversations about it stay in your inbox.</p>
          <div className="ws-order-actions">
            <button
              type="button"
              className={buttonClass({ variant: "danger" })}
              onClick={() => {
                const target = deleting;
                setDeleting(null);
                void run(`Deleted “${target.name || "Untitled draft"}”`, actions.remove.mutateAsync(target.id));
              }}
            >
              <TrashIcon />
              Delete
            </button>
            <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setDeleting(null)}>
              Keep
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className="ws-order-dialog" aria-labelledby="hub-dialog-title" onCancel={close} onClick={(e) => e.target === e.currentTarget && close()}>
      <div>
        <h2 id="hub-dialog-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

/** InlineEditCell: the price is a button; Enter saves, Escape cancels. Prices are whole naira. */
function InlinePrice({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const shown = `₦${value.toLocaleString("en-NG")}`;
  if (!editing)
    return (
      <button type="button" className="ws-inline-edit" aria-label={`${label}: ${shown}. Edit`} onClick={() => { setText(String(value)); setEditing(true); }}>
        {shown}
      </button>
    );
  const save = () => {
    setEditing(false);
    const digits = text.replace(/[^\d]/g, "");
    if (digits && Number(digits) > 0 && Number(digits) !== value) onSave(Number(digits));
  };
  return (
    <input
      className="ws-input ws-inline-edit__input"
      aria-label={label}
      inputMode="numeric"
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); save(); }
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}
