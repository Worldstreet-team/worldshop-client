"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircleIcon, DeliveryTruckIcon, DotsVerticalIcon, PackageIcon, StoreIcon, WalletIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass, Menu, tabPanelProps, Tabs, toast } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { formatCurrency, kobo, toMinor } from "@ws/lib/money";
import { COLUMNS, downloadCsv, exportCsv, importCsv, TEMPLATE, type RowReport } from "./csv";
import { analytics, promote, promotionFee, stopPromotion, bulkPrice, cancelOrder, CANCEL_REASONS, confirmOrder, COURIERS, DEMO_OTP, dispatchOrder, editListing, endListing, ledgerRows, performance, reconcilePayouts, relist, sellSimilar, simulateBuyerConfirm, simulateDelivery, simulatePurchase, wallet, withdraw, type SellerOrder } from "./hub";
import { DELIVERY_METHODS, type SellerAccount, type SellerListing } from "./model";
import { updateSeller, useHydrated, useSeller } from "./store";

/* Seller Hub pages (flows S3, S5, S6, S7): ListingsTable + BulkActionBar + InlineEditCell,
   SellerOrdersTable + DispatchSheet, PayoutsPage + WithdrawFlow, PerformanceDashboard. */

const money = (minor: number) => formatCurrency(kobo(minor));
const when = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: rules.time.zone });
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Runs a model command; a thrown rule becomes the page's error message. */
function useRun() {
  const [error, setError] = useState("");
  const run = (command: (a: SellerAccount) => SellerAccount, done?: () => void) => {
    setError("");
    try { updateSeller(command); done?.(); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); return false; }
  };
  const alert = error ? <p role="alert" className="ws-sell-alert"><WarningIcon />{error}</p> : null;
  return { run, alert, setError };
}

function Gate({ title, children }: { title: string; children: (account: SellerAccount) => ReactNode }) {
  const account = useSeller();
  if (!useHydrated()) return <p className="ws-sell-loading" role="status">Loading…</p>;
  if (!account.profile) return <section className="ws-sell-empty"><StoreIcon /><h1>{title}</h1><p>Set up your shop first.</p><Link className={buttonClass({})} href="/sell/start">Start selling</Link></section>;
  return children(account);
}

function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  return <dialog ref={ref} className="ws-order-dialog" aria-labelledby="hub-dialog-title" onCancel={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}><div><h2 id="hub-dialog-title">{title}</h2>{children}</div></dialog>;
}

const Thumb = ({ src }: { src: string }) => src
  ? <img src={src} alt="" width={48} height={48} className="ws-hub-thumb" />
  : <span className="ws-hub-thumb"><PackageIcon /></span>;

/* ---------- S3 ListingsTable ---------- */

const LISTING_TABS = [{ value: "active", label: "Active" }, { value: "in_review", label: "In review" }, { value: "ended", label: "Ended" }] as const;
type ListingTab = (typeof LISTING_TABS)[number]["value"];
const STATUS_LABEL: Record<SellerListing["status"], string> = { live: "Live", paused: "Out of stock", in_review: "In review", ended: "Ended", removed: "Removed" };

export function ListingsPage() {
  return <Gate title="Listings">{(account) => <Listings account={account} />}</Gate>;
}

function Listings({ account }: { account: SellerAccount }) {
  const router = useRouter();
  const [tab, setTab] = useState<ListingTab>("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [percent, setPercent] = useState("");
  const [ending, setEnding] = useState<string[] | null>(null);
  const [promoting, setPromoting] = useState<string[] | null>(null);
  const { run, alert } = useRun();
  const inListingTab = (l: SellerListing, t: ListingTab) => t === "active" ? l.status === "live" || l.status === "paused" : t === "ended" ? l.status === "ended" || l.status === "removed" : l.status === t;
  const rows = account.listings.filter((l) => inListingTab(l, tab));
  const visible = selected.filter((id) => rows.some((r) => r.id === id));
  const all = rows.length > 0 && visible.length === rows.length;
  const change = (id: string, patch: { price_minor?: number; qty?: number }) => {
    const before = account.listings.find((l) => l.id === id)!;
    if (run((a) => editListing(a, id, patch, Date.now()))) toast({ message: `Saved “${before.title}”`, action: { label: "Undo", onClick: () => run((a) => editListing(a, id, { price_minor: before.price_minor ?? undefined, qty: before.qty }, Date.now())) } });
  };
  return <div className="ws-hub">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub</p><h1>Listings</h1></div><div className="ws-flow__actions">
      {rules.flags.bulkImport && <><Link className={buttonClass({ variant: "ghost", size: "sm" })} href="/vendor/import">Import CSV</Link>
        <button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} disabled={!account.listings.length} onClick={() => downloadCsv("worldstore-listings.csv", exportCsv(account.listings))}>Export CSV</button></>}
      <Link className={buttonClass({})} href="/sell/new">Create listing</Link></div></header>
    {alert}
    <Tabs aria-label="Listing status" idBase="listings" items={LISTING_TABS.map((t) => ({ ...t, label: `${t.label} (${account.listings.filter((l) => inListingTab(l, t.value)).length})` }))} value={tab} onChange={(v) => { setTab(v); setSelected([]); }} />
    <div {...tabPanelProps("listings", tab)}>
      {visible.length > 0 && <div className="ws-bulk" role="region" aria-label="Bulk actions">
        <strong>{visible.length} selected</strong>
        <form className="ws-bulk__price" onSubmit={(e) => { e.preventDefault(); if (run((a) => bulkPrice(a, visible, Number(percent), Date.now()))) { toast({ message: `Updated ${visible.length} price${visible.length > 1 ? "s" : ""}` }); setPercent(""); } }}>
          <label htmlFor="bulk-pct">Change price by %</label><input id="bulk-pct" className="ws-input" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="−10" /><button type="submit" className={buttonClass({ size: "sm", variant: "ghost" })}>Apply</button>
        </form>
        {rules.flags.promotions && tab === "active" && <button type="button" className={buttonClass({ size: "sm", variant: "ghost" })} onClick={() => setPromoting(visible)}>Promote</button>}
        {tab !== "ended" && <button type="button" className={buttonClass({ size: "sm", variant: "ghost" })} onClick={() => setEnding(visible)}>End listings</button>}
        <button type="button" className={buttonClass({ size: "sm", variant: "quiet" })} onClick={() => setSelected([])}>Clear</button>
      </div>}
      {rows.length ? <table className="ws-table">
        <thead><tr><th scope="col"><input type="checkbox" aria-label="Select all" checked={all} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /><span className="ws-table__all" aria-hidden="true">Select all</span></th><th scope="col">Item</th><th scope="col">Price</th><th scope="col">Qty</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="cx-sr-only">Actions</span></th></tr></thead>
        <tbody>{rows.map((l) => <tr key={l.id}>
          <td><input type="checkbox" aria-label={`Select ${l.title}`} checked={visible.includes(l.id)} onChange={(e) => setSelected(e.target.checked ? [...visible, l.id] : visible.filter((x) => x !== l.id))} /></td>
          <td className="ws-table__item"><Thumb src={l.photos[0]?.url ?? ""} /><span><strong>{l.title}</strong>{l.status === "removed" && <small className="ws-table__note">{l.review_reason}</small>}{l.revisions.length > 0 && <small>{l.revisions.length} edit{l.revisions.length > 1 ? "s" : ""} logged</small>}</span></td>
          <td data-label="Price"><InlineEdit label={`Price of ${l.title}`} value={l.price_minor ?? 0} money disabled={l.status === "ended" || l.status === "removed"} onSave={(v) => change(l.id, { price_minor: v })} /></td>
          <td data-label="Qty"><InlineEdit label={`Quantity of ${l.title}`} value={l.qty} disabled={l.status === "ended" || l.status === "removed"} onSave={(v) => change(l.id, { qty: v })} /></td>
          <td data-label="Status"><span className="ws-hub-status" data-status={l.status}>{STATUS_LABEL[l.status]}</span>{l.promotion && <span className="ws-hub-status" data-status="promoted">Promoted {l.promotion.rate_percent}%</span>}</td>
          <td data-label="Updated">{when.format(l.updated_at)}</td>
          <td className="ws-table__actions"><Menu label={`Actions for ${l.title}`} iconOnly variant="quiet" size="sm" sheetTitle={l.title} trigger={<DotsVerticalIcon />} items={[
            ...(l.status === "removed" ? [] : l.status === "ended" ? [{ label: "Relist", onSelect: () => run((a) => relist(a, l.id, Date.now())) }] : [{ label: "End listing", danger: true, onSelect: () => setEnding([l.id]) }]),
            ...(rules.flags.promotions && (l.status === "live" || l.status === "paused") ? [l.promotion ? { label: "Stop promoting", onSelect: () => run((a) => stopPromotion(a, [l.id], Date.now())) } : { label: "Promote…", onSelect: () => setPromoting([l.id]) }] : []),
            { label: "Sell similar", onSelect: () => { const id = uid("d"); if (run((a) => sellSimilar(a, l.id, id, Date.now()))) router.push(`/sell/${id}`); } },
            ...(l.status === "live" ? ["separator" as const, { label: "Demo: simulate a buyer purchase", onSelect: () => { if (run((a) => simulatePurchase(a, l.id, `WS-${String(Date.now()).slice(-6)}`, Date.now()))) toast({ message: "New order: a buyer paid into escrow", action: { label: "View orders", onClick: () => router.push("/vendor/orders") } }); } }] : []),
          ]} /></td>
        </tr>)}</tbody>
      </table> : <section className="ws-order-empty"><PackageIcon /><h2>No {LISTING_TABS.find((t) => t.value === tab)!.label.toLowerCase()} listings</h2>{tab === "active" && <Link className={buttonClass({ variant: "ghost" })} href="/sell/new">Create a listing</Link>}</section>}
    </div>
    {promoting && <PromoteDialog account={account} ids={promoting} close={() => { setPromoting(null); setSelected([]); }} />}
    {ending && <Dialog title={ending.length > 1 ? `End ${ending.length} listings?` : "End this listing?"} close={() => setEnding(null)}>
      <p>Buyers won’t see {ending.length > 1 ? "them" : "it"} any more. Open offers are declined automatically. You can relist from the Ended tab.</p>
      <div className="ws-order-actions"><button type="button" className={buttonClass({ variant: "danger" })} onClick={() => run((a) => ending.reduce((acc, id) => endListing(acc, id, Date.now()), a), () => { setEnding(null); setSelected([]); })}>End {ending.length > 1 ? "listings" : "listing"}</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setEnding(null)}>Keep</button></div>
    </Dialog>}
  </div>;
}

/** InlineEditCell: the value is a button; Enter saves, Escape cancels. */
function InlineEdit({ label, value, money: isMoney, disabled, onSave }: { label: string; value: number; money?: boolean; disabled?: boolean; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const shown = isMoney ? money(value) : String(value);
  if (disabled) return <span>{shown}</span>;
  if (!editing) return <button type="button" className="ws-inline-edit" aria-label={`${label}: ${shown}. Edit`} onClick={() => { setText(String(isMoney ? value / 100 : value)); setEditing(true); }}>{shown}</button>;
  const save = () => {
    setEditing(false);
    const digits = text.replace(/[^\d]/g, "");
    if (!digits) return;
    const next = isMoney ? toMinor(Number(digits)) : Number(digits);
    if (next !== value) onSave(next);
  };
  return <input className="ws-input ws-inline-edit__input" aria-label={label} inputMode="numeric" autoFocus value={text} onChange={(e) => setText(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") setEditing(false); }} />;
}

/* ---------- S5 SellerOrdersTable + DispatchSheet ---------- */

const ORDER_TABS = [{ value: "to_ship", label: "To ship" }, { value: "shipped", label: "Shipped" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }] as const;
type OrderTab = (typeof ORDER_TABS)[number]["value"];
const inTab = (o: SellerOrder, tab: OrderTab) => tab === "to_ship" ? ["paid", "preparing"].includes(o.status) : tab === "shipped" ? ["dispatched", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "disputed"].includes(o.status) : tab === "completed" ? o.status === "completed" : ["cancelled", "refunded", "returned"].includes(o.status);
const ORDER_LABEL: Partial<Record<SellerOrder["status"], string>> = { paid: "Confirm within 12 h", preparing: "Ready to dispatch", dispatched: "On the way", delivered: "Buyer is checking", completed: "Completed", refunded: "Cancelled · refunded" };

function due(at: number, now: number) {
  const h = Math.round((at - now) / 3_600_000);
  return h >= 0 ? `due in ${h < 1 ? "under an hour" : `${h} h`}` : `${-h} h overdue`;
}

export function SellerOrdersPage() {
  return <Gate title="Orders">{(account) => <Orders account={account} />}</Gate>;
}

function Orders({ account }: { account: SellerAccount }) {
  const [tab, setTab] = useState<OrderTab>("to_ship");
  const [dispatching, setDispatching] = useState<SellerOrder | null>(null);
  const [cancelling, setCancelling] = useState<SellerOrder | null>(null);
  const [now] = useState(() => Date.now());
  const { run, alert } = useRun();
  const rows = account.orders.filter((o) => inTab(o, tab));
  return <div className="ws-hub">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub</p><h1>Orders</h1><p>Money from each order is held in escrow until the buyer confirms delivery.</p></div></header>
    {alert}
    <Tabs aria-label="Order status" idBase="sorders" items={ORDER_TABS.map((t) => ({ ...t, label: `${t.label} (${account.orders.filter((o) => inTab(o, t.value)).length})` }))} value={tab} onChange={setTab} />
    <div {...tabPanelProps("sorders", tab)}>{rows.length ? <ul className="ws-hub-rows ws-hub-rows--flush">{rows.map((o) => <li key={o.id}>
      <Thumb src={o.photo} />
      <span className="ws-hub-rows__main"><strong>{o.title}</strong>
        <small>{o.id} · {o.buyer} in {o.buyer_area} · {money(o.total_minor)} · {DELIVERY_METHODS[o.delivery_method].label}</small>
        <small data-tone={["paid", "preparing"].includes(o.status) && now > o.dispatch_due_at ? "late" : undefined}>{ORDER_LABEL[o.status] ?? o.status.replaceAll("_", " ")}{o.status === "paid" && ` · ${due(o.confirm_due_at, now)}`}{o.status === "preparing" && ` · dispatch ${due(o.dispatch_due_at, now)}`}{o.dispatch?.kind === "platform" && ` · ${o.dispatch.courier} ${o.dispatch.tracking}`}{o.dispatch?.kind === "meet_up" && ` · handover PIN ${o.dispatch.pin} at ${o.dispatch.place}`}{o.dispatch?.kind === "own" && ` · ${o.dispatch.rider_name}, ${o.dispatch.eta}`}{o.cancel_reason && ` · ${o.cancel_reason}`}</small>
      </span>
      <span className="ws-hub-rows__actions">
        {o.status === "paid" && <button type="button" className={buttonClass({ size: "sm" })} onClick={() => run((a) => confirmOrder(a, o.id, Date.now()))}>Confirm order</button>}
        {o.status === "preparing" && <button type="button" className={buttonClass({ size: "sm" })} onClick={() => setDispatching(o)}><DeliveryTruckIcon />Dispatch</button>}
        {["paid", "preparing"].includes(o.status) && <button type="button" className={buttonClass({ size: "sm", variant: "quiet" })} onClick={() => setCancelling(o)}>Cancel</button>}
        {o.status === "dispatched" && <button type="button" className={buttonClass({ size: "sm", variant: "ghost" })} onClick={() => run((a) => simulateDelivery(a, o.id, Date.now()))}>Demo: mark delivered</button>}
        {o.status === "delivered" && <button type="button" className={buttonClass({ size: "sm", variant: "ghost" })} onClick={() => run((a) => simulateBuyerConfirm(a, o.id, Date.now()))}>Demo: buyer confirms</button>}
      </span>
    </li>)}</ul> : <section className="ws-order-empty"><PackageIcon /><h2>No orders here</h2><p>{account.listings.some((l) => l.status === "live") ? "Try “Demo: simulate a buyer purchase” from a listing’s menu." : "Orders appear once a buyer pays for one of your listings."}</p><Link className={buttonClass({ variant: "ghost" })} href="/vendor/listings">Go to listings</Link></section>}</div>
    {dispatching && <DispatchSheet order={dispatching} close={() => setDispatching(null)} />}
    {cancelling && <CancelDialog order={cancelling} close={() => setCancelling(null)} />}
    <p className="ws-sell-demo">Demo workspace · Buyers, couriers and deliveries are simulated on this device.</p>
  </div>;
}

function DispatchSheet({ order, close }: { order: SellerOrder; close: () => void }) {
  const tracked = order.total_minor > rules.tracking.requiredAboveMinor;
  const [kind, setKind] = useState<"platform" | "own" | "meet_up">(order.delivery_method === "meet_up" ? "meet_up" : "platform");
  const [courier, setCourier] = useState<string>(COURIERS[0]);
  const [rider, setRider] = useState({ name: "", phone: "", eta: "" });
  const [place, setPlace] = useState("");
  const { run, alert } = useRun();
  const submit = () => run((a) => dispatchOrder(a, order.id, kind === "platform" ? { kind, courier } : kind === "own" ? { kind, rider_name: rider.name, rider_phone: rider.phone, eta: rider.eta } : { kind, place }, Date.now()), () => { close(); toast({ message: "Dispatched · the buyer has been notified" }); });
  return <Dialog title="Dispatch order" close={close}>
    <p>{order.title} · to {order.buyer_area}</p>
    {alert}
    <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <fieldset className="ws-fieldset"><legend>How is it going?</legend><div className="ws-choice-list">
        <label className="ws-choice"><input type="radio" name="kind" checked={kind === "platform"} onChange={() => setKind("platform")} /><span><strong>Courier with tracking</strong><small>We generate a label; tracking updates the buyer.</small></span></label>
        <label className="ws-choice"><input type="radio" name="kind" checked={kind === "own"} disabled={tracked} onChange={() => setKind("own")} /><span><strong>My own rider</strong><small>{tracked ? "Not for orders over ₦20,000: they need tracking." : "Give the buyer the rider’s name, phone and arrival time."}</small></span></label>
        <label className="ws-choice"><input type="radio" name="kind" checked={kind === "meet_up"} onChange={() => setKind("meet_up")} /><span><strong>Meet-up</strong><small>The buyer gives you a handover PIN to confirm.</small></span></label>
      </div></fieldset>
      {kind === "platform" && <div className="ws-form-field"><label htmlFor="courier">Courier</label><select id="courier" className="ws-input" value={courier} onChange={(e) => setCourier(e.target.value)}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></div>}
      {kind === "own" && <div className="ws-form-grid">
        <div className="ws-form-field"><label htmlFor="rider">Rider’s name</label><input id="rider" className="ws-input" value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} /></div>
        <div className="ws-form-field"><label htmlFor="rphone">Rider’s phone</label><input id="rphone" className="ws-input" type="tel" value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} /></div>
        <div className="ws-form-field"><label htmlFor="eta">Arrives</label><input id="eta" className="ws-input" placeholder="Today, 4–6pm" value={rider.eta} onChange={(e) => setRider({ ...rider, eta: e.target.value })} /></div>
      </div>}
      {kind === "meet_up" && <div className="ws-form-field"><label htmlFor="place">Meeting place</label><p id="place-hint" className="ws-form-field__hint">Agree it in chat. Pick a busy public place.</p><input id="place" className="ws-input" aria-describedby="place-hint" value={place} onChange={(e) => setPlace(e.target.value)} /></div>}
      <div className="ws-order-actions"><button type="submit" className={buttonClass({})}>Mark as dispatched</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={close}>Cancel</button></div>
    </form>
  </Dialog>;
}

function CancelDialog({ order, close }: { order: SellerOrder; close: () => void }) {
  const [reason, setReason] = useState("");
  const { run, alert } = useRun();
  return <Dialog title="Cancel this order?" close={close}>
    <p>The buyer gets a full refund of {money(order.total_minor)} and the item goes back in stock. Cancellations other than an unreachable buyer count against your seller standards.</p>
    {alert}
    <fieldset className="ws-fieldset"><legend>Reason</legend><div className="ws-choice-list">{CANCEL_REASONS.map((r) => <label key={r} className="ws-choice"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}</div></fieldset>
    <div className="ws-order-actions"><button type="button" className={buttonClass({ variant: "danger" })} onClick={() => run((a) => cancelOrder(a, order.id, reason, Date.now()), close)}>Cancel order</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={close}>Keep order</button></div>
  </Dialog>;
}

/* ---------- S6 PayoutsPage + WithdrawFlow ---------- */

export function PayoutsPage() {
  return <Gate title="Payouts">{(account) => <Payouts account={account} />}</Gate>;
}

function Payouts({ account }: { account: SellerAccount }) {
  const [now] = useState(() => Date.now());
  useEffect(() => { updateSeller((a) => reconcilePayouts(a, Date.now())); }, []);
  const w = wallet(account);
  const [open, setOpen] = useState(false);
  const rows = ledgerRows(account).filter((r) => ["seller_pending", "seller_available", "seller_withdrawn", "platform_revenue", "buyer_refunded"].includes(r.credit_account) || r.reason_code === "payment_captured");
  const delay = rules.escrow.payoutDelay.new;
  const held = account.withdraw_hold_until !== null && now < account.withdraw_hold_until;
  return <div className="ws-hub">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub</p><h1>Payouts</h1></div>
      <button type="button" className={buttonClass({})} disabled={w.available < rules.fees.minWithdrawalMinor} onClick={() => setOpen(true)}><WalletIcon />Withdraw</button></header>
    <section aria-label="Balances" className="ws-balances">
      {([["Available", w.available, "Ready to withdraw to your bank."], ["Pending", w.pending, `Released by buyers; available after ${delay.delayHours} h (${delay.reservePercent}% held ${delay.reserveDays} days on your first ${delay.firstOrders} orders).`], ["In escrow", w.in_escrow, "Paid by buyers, held until they confirm delivery."], ["Withdrawn", w.withdrawn, "Sent to your bank."]] as const).map(([label, value, help]) =>
        <div key={label} className="ws-balance" data-key={label.toLowerCase().replace(" ", "-")}><span>{label}</span><strong>{money(value)}</strong><small>{help}</small></div>)}
    </section>
    {w.available < rules.fees.minWithdrawalMinor && <p className="ws-form-field__hint">You can withdraw once at least {money(rules.fees.minWithdrawalMinor)} is available.</p>}
    {held && <p className="ws-sell-tip"><WarningIcon />Withdrawals are on hold until {when.format(account.withdraw_hold_until!)} because your bank account changed.</p>}
    <section className="ws-sell-card" aria-labelledby="payout-acct"><h2 id="payout-acct">Payout account</h2>
      <p>{account.payout?.kind === "bank" ? `${account.payout.bank} ••${account.payout.account_last4} · ${account.payout.account_name}` : account.payout ? "WorldStore wallet only. Add a bank account to withdraw." : "None yet."}</p>
      <Link className={buttonClass({ variant: "ghost", size: "sm" })} href="/sell/start">{account.payout ? "Manage in shop setup" : "Add a payout account"}</Link></section>
    {account.withdrawals.length > 0 && <section className="ws-sell-card" aria-labelledby="wd"><h2 id="wd">Withdrawals</h2><ul className="ws-hub-rows">{account.withdrawals.map((x) => <li key={x.id} className="ws-hub-rows--text">
      <span className="ws-hub-rows__main"><strong>{money(x.amount_minor)} to {x.bank}</strong><small>{when.format(x.at)}{x.reason && ` · ${x.reason}`}</small></span>
      <span className="ws-hub-status" data-status={x.status === "paid" ? "live" : "in_review"}>{x.status === "paid" ? "Paid" : "Failed"}</span></li>)}</ul></section>}
    <section className="ws-sell-card" aria-labelledby="ledger"><h2 id="ledger">Transactions</h2>
      {rows.length ? <table className="ws-table ws-table--ledger"><thead><tr><th scope="col">Date</th><th scope="col">Order</th><th scope="col">What happened</th><th scope="col">Amount</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td data-label="Date">{when.format(r.created_at)}</td><td data-label="Order">{r.title}</td><td data-label="What happened">{LEDGER_LABEL[r.reason_code] ?? r.reason_code.replaceAll("_", " ")}</td><td data-label="Amount" className="ws-num">{money(r.amount_minor)}</td></tr>)}</tbody></table>
        : <p className="ws-form-field__hint">No money has moved yet.</p>}</section>
    {open && <WithdrawFlow account={account} close={() => setOpen(false)} />}
    <p className="ws-sell-demo">Demo workspace · Balances come from this device’s ledger. No money moves.</p>
  </div>;
}

const LEDGER_LABEL: Record<string, string> = { payment_captured: "Buyer paid into escrow", fees_earned: "WorldStore fees", escrow_released: "Released to pending", payout_available: "Now available", reserve_released: "Reserve released", withdrawal: "Withdrawn to bank", refund_approved: "Refund approved", refund_paid: "Refunded to buyer" };

function WithdrawFlow({ account, close }: { account: SellerAccount; close: () => void }) {
  const available = wallet(account).available;
  const [step, setStep] = useState<"amount" | "otp" | "done">("amount");
  const [amount, setAmount] = useState(String(available / 100));
  const [otp, setOtp] = useState("");
  const [outcome, setOutcome] = useState<"paid" | "failed">("paid");
  const [result, setResult] = useState<"paid" | "failed">("paid");
  const { run, alert, setError } = useRun();
  const minor = toMinor(Number(amount.replace(/[^\d]/g, "") || 0));
  return <Dialog title="Withdraw to your bank" close={close}>
    {alert}
    {step === "amount" && <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); setError(""); if (minor < rules.fees.minWithdrawalMinor) return setError("The minimum withdrawal is ₦1,000."); if (minor > available) return setError("That’s more than your available balance."); setStep("otp"); }}>
      <div className="ws-form-field"><label htmlFor="wd-amount">Amount (₦)</label><p id="wd-hint" className="ws-form-field__hint">Available {money(available)} · minimum {money(rules.fees.minWithdrawalMinor)} · no withdrawal fee</p><input id="wd-amount" className="ws-input ws-input--money" inputMode="numeric" aria-describedby="wd-hint" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <p>To {account.payout?.kind === "bank" ? `${account.payout.bank} ••${account.payout.account_last4}` : "your bank"}</p>
      <div className="ws-order-actions"><button type="submit" className={buttonClass({})}>Continue</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={close}>Cancel</button></div>
    </form>}
    {step === "otp" && <form className="ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); if (run((a) => withdraw(a, minor, otp, outcome, uid("W"), Date.now()))) { setResult(outcome); setStep("done"); } }}>
      <p>For your security, enter the 6-digit code we sent to your phone.</p>
      <div className="ws-form-field"><label htmlFor="otp">Code</label><p id="otp-hint" className="ws-form-field__hint">Demo code: {DEMO_OTP}</p><input id="otp" className="ws-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-describedby="otp-hint" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} /></div>
      <div className="ws-form-field"><label htmlFor="wd-outcome">Demo: bank result</label><select id="wd-outcome" className="ws-input" value={outcome} onChange={(e) => setOutcome(e.target.value as "paid" | "failed")}><option value="paid">Transfer succeeds</option><option value="failed">Bank rejects transfer</option></select></div>
      <div className="ws-order-actions"><button type="submit" className={buttonClass({})}>Withdraw {money(minor)}</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setStep("amount")}>Back</button></div>
    </form>}
    {step === "done" && <div className="ws-flow__body" role="status">{result === "paid" ? <p className="ws-sell-tip" data-tone="ok"><CheckCircleIcon />{money(minor)} is on its way to your bank.</p> : <p className="ws-sell-tip"><WarningIcon />The bank rejected the transfer. Your money is back in your available balance.</p>}
      <div className="ws-order-actions"><button type="button" className={buttonClass({})} onClick={close}>Done</button></div></div>}
  </Dialog>;
}

/* ---------- S7 PerformanceDashboard + StandardsMeter ---------- */

export function PerformancePage() {
  return <Gate title="Performance">{(account) => <Performance account={account} />}</Gate>;
}

function Performance({ account }: { account: SellerAccount }) {
  const [now] = useState(() => Date.now());
  const p = performance(account, now);
  return <div className="ws-hub">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub · last 90 days</p><h1>Performance</h1></div></header>
    <section className="ws-sell-card ws-level" aria-labelledby="level"><p className="ws-sell-eyebrow">Seller level</p><h2 id="level">{p.level}</h2>
      <p>{p.level === "New" ? `Your first ${rules.escrow.payoutDelay.new.firstOrders} completed orders are a protection window: softer penalties while you learn. ${p.completed} of ${rules.escrow.payoutDelay.new.firstOrders} done.` : p.failing ? "One or more standards are below target. Ranking and payouts may slow until they recover." : "You meet every standard."}</p></section>
    <ul className="ws-meters">{p.metrics.map((m) => {
      const ok = m.value === null || m.value <= m.target;
      return <li key={m.key} className="ws-sell-card" data-ok={ok || undefined}>
        <div className="ws-meter__head"><h2>{m.label}</h2><strong>{m.value === null ? "—" : `${m.value}${m.unit}`}</strong></div>
        <div className="ws-meter" role="meter" aria-label={m.label} aria-valuemin={0} aria-valuemax={m.target * 2} aria-valuenow={m.value ?? 0} aria-valuetext={m.value === null ? "No data yet" : `${m.value}${m.unit}, target under ${m.target}${m.unit}`}><span style={{ inlineSize: `${Math.min(100, (m.value ?? 0) / (m.target * 2) * 100)}%` }} /><i style={{ insetInlineStart: "50%" }} /></div>
        <p className="ws-form-field__hint">{m.value === null ? "No orders yet." : ok ? `Within target (under ${m.target}${m.unit}).` : `Above the ${m.target}${m.unit} target.`} {m.help}</p>
      </li>;
    })}</ul>
    <p className="ws-form-field__hint">Average reply time and ratings appear once buyers message and review you. Anything that affects your level is explained here and can be appealed.</p>
  </div>;
}

function PromoteDialog({ account, ids, close }: { account: SellerAccount; ids: string[]; close: () => void }) {
  const { minRatePercent: min, maxRatePercent: max, suggestedRatePercent } = rules.promotions;
  const [rate, setRate] = useState(String(account.listings.find((l) => l.id === ids[0])?.promotion?.rate_percent ?? suggestedRatePercent));
  const { run, alert } = useRun();
  const listing = ids.length === 1 ? account.listings.find((l) => l.id === ids[0]) : undefined;
  const r = Number(rate);
  return <Dialog title={ids.length > 1 ? `Promote ${ids.length} listings` : `Promote “${listing?.title}”`} close={close}>
    <p>Promoted listings rank higher in search, marked Sponsored. You pay the ad rate only if the item sells while promoted, taken when the buyer’s payment is released.</p>
    <p className="ws-form-field__hint">Demo: ranking takes effect once your listings are served from WorldStore’s servers; the fee already applies to demo sales.</p>
    {alert}
    <div className="ws-form-field"><label htmlFor="ad-rate">Ad rate (%)</label><p id="ad-rate-hint" className="ws-form-field__hint">{min}–{max}%. Higher rates rank higher. Suggested: {suggestedRatePercent}%.</p>
      <input id="ad-rate" className="ws-input" type="number" min={min} max={max} step={1} value={rate} aria-describedby="ad-rate-hint" onChange={(e) => setRate(e.target.value)} /></div>
    {listing?.price_minor && Number.isInteger(r) && r >= min && r <= max && <p className="ws-sell-tip">If it sells at {money(listing.price_minor)}, the ad fee is {money(promotionFee(listing.price_minor, r))}.</p>}
    <div className="ws-order-actions"><button type="button" className={buttonClass({})} onClick={() => run((a) => promote(a, ids, Number(rate), Date.now()), () => { toast({ message: ids.length > 1 ? `Promoting ${ids.length} listings at ${rate}%` : `Promoting at ${rate}%` }); close(); })}>Promote</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={close}>Cancel</button></div>
  </Dialog>;
}

/* ---------- BulkImport (R-122) ---------- */

export function ImportPage() {
  return <Gate title="Import listings">{() => <Import />}</Gate>;
}

function Import() {
  const [report, setReport] = useState<RowReport[] | null>(null);
  const [name, setName] = useState("");
  const { run, alert, setError } = useRun();
  const load = async (file: File | undefined) => {
    if (!file) return;
    setReport(null); setName(file.name);
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return setError("Choose a .csv file. In a spreadsheet use File › Download › CSV.");
    const text = await file.text();
    let result: RowReport[] = [];
    if (run((a) => { const out = importCsv(a, text, Date.now(), (n) => uid(`i${n}`)); result = out.report; return out.account; })) setReport(result);
  };
  const ok = report?.filter((r) => r.draft_id) ?? [];
  const bad = report?.filter((r) => !r.draft_id) ?? [];
  return <>
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub · Listings</p><h1>Import listings</h1><p>Add up to {rules.bulkImport.maxRows} items from a spreadsheet. Each valid row becomes a draft; add photos, then publish.</p></div></header>
    <ol className="ws-import-steps">
      <li><strong>Download the template</strong><span>Columns: {COLUMNS.join(", ")}. Specifics are Key=Value pairs separated by “;”.</span><button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => downloadCsv("worldstore-import-template.csv", TEMPLATE)}>Download template</button></li>
      <li><strong>Fill it in and save as CSV</strong><span>One item per row. Prices in whole naira.</span></li>
      <li><strong>Upload</strong><label className="ws-dropzone ws-import-drop"><span>{name || "Choose a CSV file"}</span><input type="file" accept=".csv,text/csv" className="cx-sr-only" onChange={(e) => { void load(e.target.files?.[0]); e.target.value = ""; }} /></label></li>
    </ol>
    {alert}
    {report && <section className="ws-sell-card" aria-labelledby="import-result" role="status"><h2 id="import-result">{ok.length} draft{ok.length === 1 ? "" : "s"} created{bad.length ? `, ${bad.length} row${bad.length === 1 ? "" : "s"} need fixing` : ""}</h2>
      {bad.length > 0 && <ul className="ws-import-errors">{bad.map((r) => <li key={r.row}><strong>Row {r.row}{r.title ? `: ${r.title}` : ""}</strong><ul>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></li>)}</ul>}
      {bad.length > 0 && <p className="ws-form-field__hint">Fix these rows and upload just them again. Rows that worked were already saved.</p>}
      {ok.length > 0 && <Link className={buttonClass({})} href="/vendor">See drafts in Seller Hub</Link>}
    </section>}
  </>;
}

/* ---------- AnalyticsDashboard ---------- */

export function AnalyticsPage() {
  return <Gate title="Analytics">{(account) => <Analytics account={account} />}</Gate>;
}

const dayLabel = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
function Analytics({ account }: { account: SellerAccount }) {
  const [now] = useState(() => Date.now());
  const a = analytics(account, now);
  const max = Math.max(1, ...a.daily.map((d) => d.gross_minor));
  const [hover, setHover] = useState<number | null>(null);
  const tiles: [string, string, string][] = [
    ["Sales", money(a.gross_minor), `${a.orders} order${a.orders === 1 ? "" : "s"}${a.cancelled ? `, ${a.cancelled} cancelled` : ""}`],
    ["Earned", money(a.earned_minor), "Released to you after fees"],
    ["Average order", a.orders ? money(a.average_minor) : "—", "Item plus delivery"],
    ["Fees", money(a.fees_minor + a.ad_fees_minor), a.ad_fees_minor ? `${money(a.ad_fees_minor)} on promotions${a.promoted_orders ? ` (${a.promoted_orders} promoted sale${a.promoted_orders === 1 ? "" : "s"})` : ""}` : "No promotion fees"],
  ];
  const shown = hover === null ? null : a.daily[hover];
  return <div className="ws-hub">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Seller Hub · last {a.days} days</p><h1>Analytics</h1></div></header>
    <ul className="ws-balances ws-admin-tiles">{tiles.map(([label, value, sub]) => <li key={label} className="ws-balance"><span>{label}</span><strong>{value}</strong><small>{sub}</small></li>)}</ul>
    <section className="ws-sell-card" aria-labelledby="daily"><h2 id="daily">Daily sales</h2>
      {a.gross_minor ? <>
        <p className="ws-chart__readout" aria-live="polite">{shown ? `${dayLabel.format(Date.parse(shown.day))}: ${money(shown.gross_minor)} · ${shown.orders} order${shown.orders === 1 ? "" : "s"}` : `Peak day ${money(max)}. Tap, hover or focus a bar for the day.`}</p>
        <div className="ws-chart" role="group" aria-label={`Daily sales, last ${a.days} days`} onMouseLeave={() => setHover(null)}>
          {a.daily.map((d, i) => <button key={d.day} type="button" className="ws-chart__bar" aria-label={`${dayLabel.format(Date.parse(d.day))}: ${money(d.gross_minor)}, ${d.orders} order${d.orders === 1 ? "" : "s"}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
            <span style={{ blockSize: `${d.gross_minor / max * 100}%` }} data-empty={!d.gross_minor || undefined} />
          </button>)}
        </div>
        <div className="ws-chart__axis" aria-hidden="true"><span>{dayLabel.format(Date.parse(a.daily[0].day))}</span><span>Today</span></div>
        <details className="ws-chart__table"><summary>Show as a table</summary><table className="ws-table ws-table--ledger"><thead><tr><th scope="col">Day</th><th scope="col">Orders</th><th scope="col">Sales</th></tr></thead>
          <tbody>{a.daily.filter((d) => d.orders).map((d) => <tr key={d.day}><td data-label="Day">{dayLabel.format(Date.parse(d.day))}</td><td data-label="Orders" className="ws-num">{d.orders}</td><td data-label="Sales" className="ws-num">{money(d.gross_minor)}</td></tr>)}</tbody></table></details>
      </> : <p className="ws-chart-empty">No sales in this period yet.</p>}
    </section>
    <section className="ws-sell-card" aria-labelledby="top"><h2 id="top">Top listings</h2>
      {a.top.length ? <ol className="ws-hub-rows">{a.top.map((t) => <li key={t.title} className="ws-hub-rows--text"><span className="ws-hub-rows__main"><strong>{t.title}</strong><small>{t.units} sold{t.promoted ? " · promoted" : ""}</small></span><span className="ws-num">{money(t.gross_minor)}</span></li>)}</ol> : <p className="ws-form-field__hint">No sales in the last {a.days} days.</p>}
    </section>
    <p className="ws-form-field__hint">Views, watchers and search impressions appear once listings are served from WorldStore’s servers and visits are counted there.</p>
  </div>;
}
