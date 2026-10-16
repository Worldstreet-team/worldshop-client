"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccountIcon, CheckShieldIcon, ClockIcon, DocumentsIcon, FlagIcon, GridIcon, MagnifyingGlassIcon, ReceiptLinesIcon, ShieldExclamationIcon, WarningIcon } from "@ws/components/icons";
import { buttonClass, toast } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { useNegotiations } from "@ws/features/negotiation/store";
import { needsMediaEvidence, type Order } from "@ws/features/orders/model";
import { dispatchOrder, useOrders } from "@ws/features/orders/store";
import { updateSeller, useHydrated, useSeller } from "@ws/features/sell/store";
import { formatCurrency, kobo, toMinor } from "@ws/lib/money";
import type { Posting } from "@ws/lib/ledger";
import { decideReversal, holdPayouts, moderateListing, moderationQueue, needsSecondApprover, opsDueAt, POLICIES, requestReversal, resolveReport, reverseSellerPosting, riskSignals, ROLE_LABEL, STAFF, staffById, supportSearch, suspendSeller, TEMPLATES, type LedgerSource, type QueueItem, type Reversal, type Role, type SearchHit } from "./model";
import { logAction, updateAdmin, useAdmin } from "./store";

/* AdminShell + ModerationQueue, CaseView, LedgerViewer, RiskRulesTable, SupportConsole and
   AuditLogTable (flows Part C). Every successful action is followed by an audit entry. */

const money = (minor: number) => formatCurrency(kobo(minor));
const when = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: rules.time.zone });
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const NAV: { href: string; label: string; icon: typeof GridIcon; roles: readonly Role[] }[] = [
  { href: "/admin", label: "Overview", icon: GridIcon, roles: ["moderation", "disputes", "finance", "support"] },
  { href: "/admin/moderation", label: "Moderation", icon: FlagIcon, roles: ["moderation"] },
  { href: "/admin/cases", label: "Cases", icon: CheckShieldIcon, roles: ["disputes"] },
  { href: "/admin/ledger", label: "Ledger", icon: ReceiptLinesIcon, roles: ["finance"] },
  { href: "/admin/risk", label: "Risk", icon: ShieldExclamationIcon, roles: ["finance"] },
  { href: "/admin/support", label: "Support", icon: MagnifyingGlassIcon, roles: ["support"] },
  { href: "/admin/audit", label: "Audit log", icon: DocumentsIcon, roles: ["moderation", "disputes", "finance", "support"] },
];

/** Runs a cross-store action, then audits it; a thrown rule becomes the page's error. */
function useAct() {
  const [error, setError] = useState("");
  const act = (fn: () => void, entry?: { action: string; target: string; detail?: string }, done?: () => void) => {
    setError("");
    try { fn(); if (entry) logAction({ ...entry, detail: entry.detail ?? "" }); done?.(); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); return false; }
  };
  return { act, error, alert: error ? <p role="alert" className="ws-sell-alert"><WarningIcon />{error}</p> : null };
}

/** SLA timer: minutes left, red once overdue. */
function Sla({ due, now }: { due: number; now: number }) {
  const left = due - now;
  const h = Math.floor(Math.abs(left) / 3_600_000);
  const m = Math.floor(Math.abs(left) % 3_600_000 / 60_000);
  const text = `${h ? `${h} h ` : ""}${m} min`;
  return <span className="ws-sla" data-state={left < 0 ? "late" : left < 3_600_000 ? "soon" : undefined}><ClockIcon />{left < 0 ? `${text} overdue` : `${text} left`}</span>;
}
function useNow(stepMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), stepMs); return () => window.clearInterval(id); }, [stepMs]);
  return now;
}

function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  return <dialog ref={ref} className="ws-order-dialog" aria-labelledby="admin-dialog-title" onCancel={close} onClick={(e) => { if (e.target === e.currentTarget) close(); }}><div><h2 id="admin-dialog-title">{title}</h2>{children}</div></dialog>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const admin = useAdmin();
  const hydrated = useHydrated();
  const path = usePathname();
  const staff = staffById(admin.staff_id);
  if (!hydrated) return <p className="ws-sell-loading" role="status">Loading…</p>;
  if (!staff) return <section className="ws-sell-empty ws-admin-signin"><CheckShieldIcon /><h1>WorldStore staff console</h1><p>Choose a demo staff account. Each role sees only its own tools.</p>
    <ul className="ws-staff-list">{STAFF.map((s) => <li key={s.id}><button type="button" className="ws-choice" onClick={() => updateAdmin((a) => ({ ...a, staff_id: s.id }))}><AccountIcon /><span><strong>{s.name}</strong><small>{ROLE_LABEL[s.role]}</small></span></button></li>)}</ul>
    <p className="ws-sell-demo">Demo · Real staff sign in with SSO and every permission is checked on the server.</p></section>;
  return <div className="ws-seller-shell ws-admin">
    <nav aria-label="Staff console" className="ws-seller-nav"><p className="ws-sell-eyebrow">Staff console</p>
      <ul>{NAV.filter((n) => n.roles.includes(staff.role)).map(({ href, label, icon: Icon }) => <li key={href}><Link href={href} aria-current={path === href || (href !== "/admin" && path.startsWith(href)) ? "page" : undefined}><Icon />{label}</Link></li>)}</ul>
      <div className="ws-admin-who"><span><strong>{staff.name}</strong><small>{ROLE_LABEL[staff.role]}</small></span>
        <label htmlFor="staff-switch" className="cx-sr-only">Switch demo staff account</label>
        <select id="staff-switch" className="ws-input" value={staff.id} onChange={(e) => updateAdmin((a) => ({ ...a, staff_id: e.target.value }))}>{STAFF.map((s) => <option key={s.id} value={s.id}>{s.name} · {ROLE_LABEL[s.role]}</option>)}</select>
        <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => updateAdmin((a) => ({ ...a, staff_id: null }))}>Sign out</button></div>
    </nav>
    <div className="ws-seller-main">{children}</div>
  </div>;
}

/** Role gate for a page: staff without the role see why, not the tools. */
function Gate({ roles, title, children }: { roles: readonly Role[]; title: string; children: ReactNode }) {
  const staff = staffById(useAdmin().staff_id);
  if (!staff) return null;
  if (!roles.includes(staff.role)) return <section className="ws-sell-empty"><ShieldExclamationIcon /><h1>{title}</h1><p>Your role ({ROLE_LABEL[staff.role]}) can’t open this page. It needs {roles.map((r) => ROLE_LABEL[r]).join(" or ")}.</p><Link className={buttonClass({ variant: "ghost" })} href="/admin">Back to overview</Link></section>;
  return <div className="ws-hub">{children}</div>;
}
const Head = ({ title, lede, eyebrow = "Staff console" }: { title: string; lede?: string; eyebrow?: string }) =>
  <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">{eyebrow}</p><h1>{title}</h1>{lede && <p>{lede}</p>}</div></header>;

/* ---------- Overview ---------- */

export function AdminOverview() {
  const admin = useAdmin(); const seller = useSeller(); const { orders } = useOrders(); const now = useNow();
  const queue = moderationQueue(admin, seller);
  const cases = orders.filter((o) => o.dispute && o.escrow_status === "frozen");
  const pending = admin.reversals.filter((r) => r.status === "pending");
  const tiles = [
    { label: "Moderation queue", cta: "Review the queue", value: queue.length, sub: queue[0] ? <Sla due={queue[0].due_at} now={now} /> : "Clear", href: "/admin/moderation" },
    { label: "Open cases", cta: "Go to cases", value: cases.length, sub: cases[0] ? <Sla due={opsDueAt(cases[0])!} now={now} /> : "None", href: "/admin/cases" },
    { label: "Reversals to approve", cta: "Open the ledger", value: pending.length, sub: pending.length ? "Needs finance" : "None", href: "/admin/ledger" },
    { label: "Audit entries", cta: "Read the audit log", value: admin.audit.length, sub: admin.audit[0] ? when.format(admin.audit[0].at) : "None yet", href: "/admin/audit" },
  ];
  return <Gate roles={["moderation", "disputes", "finance", "support"]} title="Overview"><Head title="Overview" lede="What needs attention first. Timers count down to each SLA." />
    <ul className="ws-balances ws-admin-tiles">{tiles.map((t) => <li key={t.label} className="ws-balance"><span>{t.label}</span><strong>{t.value}</strong><small>{t.sub}</small><Link href={t.href} className="ws-admin-tile-link">{t.cta}</Link></li>)}</ul>
    <p className="ws-sell-demo">Demo workspace · The console acts on this browser’s buyer, seller and message data. Nothing reaches real users.</p>
  </Gate>;
}

/* ---------- A1 ModerationQueue + ListingReviewPanel ---------- */

export function ModerationPage() {
  const admin = useAdmin(); const seller = useSeller(); const now = useNow();
  const queue = moderationQueue(admin, seller);
  const [open, setOpen] = useState<string | null>(null);
  const item = queue.find((q) => q.id === open) ?? null;
  return <Gate roles={["moderation"]} title="Moderation"><Head title="Moderation queue" lede={`High-risk items within ${rules.moderation.highRiskHours} h, everything else within ${rules.moderation.reportReviewHours} h.`} />
    {queue.length ? <ul className="ws-hub-rows ws-hub-rows--flush">{queue.map((q) => <li key={q.id} className="ws-hub-rows--text">
      <span className="ws-hub-rows__main"><strong>{q.title}</strong><small>{q.kind === "review" ? "Automatic flag" : "Buyer report"} · {q.seller} · {q.reason}</small><small><Sla due={q.due_at} now={now} />{q.high && <span className="ws-hub-status" data-status="in_review">High risk</span>}</small></span>
      <span className="ws-hub-rows__actions"><button type="button" className={buttonClass({ size: "sm" })} onClick={() => setOpen(q.id)}>Review</button></span>
    </li>)}</ul> : <section className="ws-order-empty"><CheckShieldIcon /><h2>Queue clear</h2><p>Flagged listings and buyer reports appear here.</p></section>}
    {item && <ReviewPanel item={item} close={() => setOpen(null)} />}
  </Gate>;
}

function ReviewPanel({ item, close }: { item: QueueItem; close: () => void }) {
  const seller = useSeller();
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const { act, alert } = useAct();
  const target = `${item.kind === "review" ? "listing" : "report"} ${item.id}`;
  const done = (message: string) => { toast({ message }); close(); };
  return <Dialog title={item.title} close={close}>
    {alert}
    {item.kind === "review" ? <div className="ws-review-evidence">
      
      <div className="ws-review-photos">{item.listing.photos.slice(0, 4).map((p, i) => <img key={i} src={p.url} alt={`Photo ${i + 1}`} width={96} height={96} />)}</div>
      <dl className="ws-order-facts"><div><dt>Price</dt><dd>{money(item.listing.price_minor ?? 0)}</dd></div><div><dt>Seller</dt><dd>{item.seller} · KYC {seller.kyc.status.replaceAll("_", " ")}</dd></div><div><dt>Prior flags</dt><dd>{seller.listings.filter((l) => l.status === "removed").length} removed</dd></div><div><dt>Flag</dt><dd>{item.reason}</dd></div></dl>
      <p className="ws-review-desc">{item.listing.description}</p>
    </div> : <dl className="ws-order-facts"><div><dt>Reason</dt><dd>{item.reason}</dd></div><div><dt>Listing</dt><dd><Link href={`/listing/${item.report.listing_id}`}>{item.report.listing_id}</Link></dd></div><div><dt>Seller</dt><dd>{item.seller}</dd></div><div><dt>Reported</dt><dd>{when.format(item.at)}</dd></div></dl>}
    <div className="ws-form-field"><label htmlFor="policy">Policy (for removal)</label><select id="policy" className="ws-input" value={code} onChange={(e) => setCode(e.target.value)}><option value="">Choose a policy</option>{POLICIES.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.label}</option>)}</select></div>
    {item.kind === "review" && <div className="ws-form-field"><label htmlFor="mod-note">Note to the seller (for “Request edit” or suspension)</label><textarea id="mod-note" className="ws-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>}
    <div className="ws-order-actions">
      {item.kind === "review" ? <>
        <button type="button" className={buttonClass({})} onClick={() => act(() => updateSeller((s) => moderateListing(s, item.id, "approve", "", Date.now())), { action: "Approved listing", target }, () => done("Approved · the listing is live"))}>Approve</button>
        <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => act(() => updateSeller((s) => moderateListing(s, item.id, "request_edit", note, Date.now())), { action: "Requested edit", target, detail: note }, () => done("Sent back to the seller with your note"))}>Request edit</button>
        <button type="button" className={buttonClass({ variant: "danger" })} onClick={() => act(() => updateSeller((s) => moderateListing(s, item.id, "remove", code, Date.now())), { action: "Removed listing", target, detail: code }, () => done("Removed · the seller has been told why"))}>Remove</button>
        <button type="button" className={buttonClass({ variant: "quiet" })} onClick={() => act(() => updateSeller((s) => suspendSeller(s, note)), { action: "Suspended seller", target: `shop ${seller.profile?.handle ?? ""}`, detail: note }, () => done("Seller suspended"))}>Suspend seller</button>
      </> : <>
        <button type="button" className={buttonClass({ variant: "danger" })} onClick={() => act(() => { if (!code) throw new Error("Choose the policy it breaks."); updateAdmin((s) => resolveReport(s, item.id, "removed")); }, { action: "Upheld report", target, detail: code }, () => done("Report upheld · removal sent to the listing service"))}>Uphold and remove</button>
        <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => act(() => updateAdmin((s) => resolveReport(s, item.id, "dismissed")), { action: "Dismissed report", target }, () => done("Report dismissed"))}>Dismiss</button>
      </>}
    </div>
    {item.kind === "report" && <p className="ws-form-field__hint">Reported listings live on WorldStore’s servers, so removal is recorded here and carried out by the listing service in production.</p>}
  </Dialog>;
}

/* ---------- A2 cases ---------- */

const HINTS: Record<string, string> = {
  not_as_described: "Refund (full or partial) if buyer photos contradict an unchanged listing; release if the listing disclosed the flaw.",
  damaged: "Refund and claim against the courier if packaging shows transit damage.",
  wrong_item: "Refund if the photos show a different item; release only with proof the right item was sent.",
  missing_parts: "Partial refund for the missing part is usual; full refund if the item can’t be used.",
  other: "Ask for more information before deciding.",
};

export function CasesPage() {
  const { orders } = useOrders(); const now = useNow();
  const cases = orders.filter((o) => o.dispute);
  return <Gate roles={["disputes"]} title="Cases"><Head title="Cases" lede={`Seller window ${rules.disputes.sellerResponseHours} h, then a decision within ${rules.disputes.opsSlaBusinessDays} business days.`} />
    {cases.length ? <ul className="ws-hub-rows ws-hub-rows--flush">{cases.map((o) => <li key={o.id} className="ws-hub-rows--text">
      <span className="ws-hub-rows__main"><strong>{o.title}</strong><small>{o.id} · {o.dispute!.reason.replaceAll("_", " ")} · {money(o.total_minor)} · {o.dispute!.status.replaceAll("_", " ")}</small>
        {o.escrow_status === "frozen" && <small><Sla due={opsDueAt(o)!} now={now} /></small>}</span>
      <span className="ws-hub-rows__actions"><Link className={buttonClass({ size: "sm" })} href={`/admin/cases/${o.id}`}>Open case</Link></span>
    </li>)}</ul> : <section className="ws-order-empty"><CheckShieldIcon /><h2>No cases</h2><p>Problems buyers report from an order appear here.</p></section>}
  </Gate>;
}

export function CaseView({ id }: { id: string }) {
  const { orders } = useOrders(); const now = useNow(); const staffId = useAdmin().staff_id;
  const order = orders.find((o) => o.id === id);
  const [outcome, setOutcome] = useState<"refund" | "release" | "partial" | "info" | "">("");
  const [amount, setAmount] = useState("");
  const [rationale, setRationale] = useState("");
  const { act, alert } = useAct();
  if (!order?.dispute) return <Gate roles={["disputes"]} title="Case"><Head title="Case not found" /><Link href="/admin/cases">Back to cases</Link></Gate>;
  const d = order.dispute;
  const open = order.escrow_status === "frozen";
  const staff = staffById(staffId)!;
  const submit = () => act(() => {
    if (!outcome) throw new Error("Choose a decision.");
    dispatchOrder({ type: "ops_decide", id: crypto.randomUUID(), order_id: order.id, outcome, refund_minor: outcome === "partial" ? toMinor(Number(amount.replace(/[^\d]/g, "") || 0)) : undefined, rationale, staff: staff.name }, Date.now());
  }, { action: outcome === "info" ? "Requested information" : `Decided case: ${outcome}`, target: `order ${order.id}`, detail: rationale }, () => { toast({ message: outcome === "info" ? "Request sent to both parties" : "Decision sent to buyer and seller" }); setRationale(""); setOutcome(""); });
  return <Gate roles={["disputes"]} title="Case">
    <Head eyebrow={`Case · ${order.id}`} title={order.title} lede={`${order.seller_name} · ${money(order.total_minor)} · ${d.status.replaceAll("_", " ")}`} />
    {open && <p className="ws-case-sla">Seller response <Sla due={d.seller_due_at} now={now} /> · Decision <Sla due={opsDueAt(order)!} now={now} /></p>}
    {alert}
    <div className="ws-order-columns">
      <div className="ws-order-main">
        <section className="ws-sell-card"><h2>Buyer’s claim</h2><dl className="ws-order-facts"><div><dt>Reason</dt><dd>{d.reason.replaceAll("_", " ")}</dd></div><div><dt>Package opened</dt><dd>{d.package_opened ? "Yes" : "No"}</dd></div><div><dt>Photo or video evidence</dt><dd>{needsMediaEvidence(d.reason) ? d.media_ready ? "Buyer has it ready" : "Missing" : "Not required"}</dd></div><div><dt>Delivery proof</dt><dd>{order.delivery_proof ? `PIN scanned · ${order.courier}` : "None"}</dd></div></dl><p className="ws-review-desc">{d.detail}</p></section>
        <section className="ws-sell-card"><h2>Timeline</h2><ol className="ws-order-timeline">{order.events.map((e, i) => <li key={i}><span /><div><strong>{e.label}</strong><time dateTime={new Date(e.at).toISOString()}>{when.format(e.at)}</time></div></li>)}</ol></section>
        <section className="ws-sell-card"><h2>Money</h2><LedgerTable rows={order.ledger.postings.map((p) => ({ ...p, title: order.title, source: "buyer_order" as const }))} /></section>
      </div>
      <aside className="ws-order-side">
        <section className="ws-sell-card"><h2>Policy hint</h2><p>{HINTS[d.reason]}</p><p className="ws-form-field__hint">Guidance, not an automatic decision (PLAN F1).</p></section>
        {d.decision ? <section className="ws-sell-card"><h2>Decision</h2><p><strong>{d.decision.outcome === "partial" ? `Partial refund of ${money(d.decision.refund_minor)}` : d.decision.outcome === "refund" ? "Full refund" : "Released to seller"}</strong> by {d.decision.staff}, {when.format(d.decision.at)}</p><p>{d.decision.rationale}</p><p className="ws-form-field__hint">Appeals: once, within {rules.disputes.appealDays} days, to a second reviewer.</p></section>
        : open ? <form className="ws-sell-card ws-flow__body" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <h2>Decide</h2>
          <fieldset className="ws-fieldset"><legend className="cx-sr-only">Decision</legend><div className="ws-choice-list">{([["refund", `Refund in full (${money(order.total_minor)})`], ["partial", "Partial refund, rest to seller"], ["release", "Release to seller"], ["info", "Request more information"]] as const).map(([v, l]) => <label key={v} className="ws-choice"><input type="radio" name="outcome" checked={outcome === v} onChange={() => setOutcome(v)} />{l}</label>)}</div></fieldset>
          {outcome === "partial" && <div className="ws-form-field"><label htmlFor="partial">Refund to buyer (₦)</label><input id="partial" className="ws-input ws-input--money" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>}
          <div className="ws-form-field"><label htmlFor="rationale">Rationale (both parties read this)</label><textarea id="rationale" className="ws-input" rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} /><p className="ws-form-field__hint">At least {rules.admin.rationaleMin} characters. Name the evidence you relied on.</p></div>
          <button type="submit" className={buttonClass({})}>Send decision</button>
        </form> : <section className="ws-sell-card"><h2>Closed</h2><p>Escrow is no longer frozen for this order.</p></section>}
        {(d.info_requests ?? []).length > 0 && <section className="ws-sell-card"><h2>Information requested</h2>{d.info_requests!.map((r) => <p key={r.at}><strong>{r.staff}</strong> · {when.format(r.at)}<br />{r.note}</p>)}</section>}
      </aside>
    </div>
  </Gate>;
}

/* ---------- LedgerViewer (R-260, R-261) ---------- */

type Row = Posting & { title: string; source: LedgerSource };
function LedgerTable({ rows, onReverse }: { rows: Row[]; onReverse?: (row: Row) => void }) {
  return <table className="ws-table ws-table--ledger"><thead><tr><th scope="col">When</th><th scope="col">Order</th><th scope="col">Debit → credit</th><th scope="col">Reason</th><th scope="col">By</th><th scope="col">Amount</th>{onReverse && <th scope="col"><span className="cx-sr-only">Actions</span></th>}</tr></thead>
    <tbody>{rows.map((r) => <tr key={`${r.source}:${r.order_id}:${r.id}`}><td data-label="When">{when.format(r.created_at)}</td><td data-label="Order">{r.order_id}</td><td data-label="Debit → credit">{r.debit_account} → {r.credit_account}</td><td data-label="Reason">{r.reason_code}</td><td data-label="By">{r.actor}</td><td data-label="Amount" className="ws-num">{money(r.amount_minor)}</td>
      {onReverse && <td>{!r.reason_code.startsWith("reversal") && <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => onReverse(r)} aria-label={`Reverse ${r.reason_code} of ${money(r.amount_minor)} on ${r.order_id}`}>Reverse</button>}</td>}</tr>)}</tbody></table>;
}

/** Posts an approved reversal to the ledger it belongs to. */
function applyReversal(r: Reversal) {
  if (r.source === "buyer_order") dispatchOrder({ type: "reverse", id: r.id, order_id: r.order_id, posting_id: r.posting_id, reason: r.reason }, Date.now());
  else updateSeller((s) => reverseSellerPosting(s, r.order_id, r.posting_id, r.reason, Date.now()));
}

export function LedgerPage() {
  const admin = useAdmin(); const seller = useSeller(); const { orders } = useOrders();
  const [filter, setFilter] = useState("");
  const [reversing, setReversing] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const { act, alert } = useAct();
  const rows: Row[] = [
    ...orders.flatMap((o) => o.ledger.postings.map((p) => ({ ...p, title: o.title, source: "buyer_order" as const }))),
    ...seller.orders.flatMap((o) => o.ledger.postings.map((p) => ({ ...p, title: o.title, source: "seller_order" as const }))),
  ].filter((r) => !filter || r.order_id.toLowerCase().includes(filter.toLowerCase())).sort((a, b) => b.created_at - a.created_at);
  const decide = (r: Reversal, approve: boolean) => act(() => {
    updateAdmin((s) => decideReversal(s, r.id, approve, Date.now()));
    if (approve) { try { applyReversal(r); } catch (cause) { updateAdmin((s) => ({ ...s, reversals: s.reversals.map((x) => x.id === r.id ? { ...x, status: "pending", decided_by: null, decided_at: null } : x) })); throw cause; } }
  }, { action: approve ? "Approved reversal" : "Rejected reversal", target: `${r.order_id} ${r.posting_id}`, detail: `${money(r.amount_minor)} · ${r.reason}` });
  const pending = admin.reversals.filter((r) => r.status === "pending");
  return <Gate roles={["finance"]} title="Ledger"><Head title="Ledger" lede="Every posting, append-only. Corrections are mirror entries; over ₦100,000 a second finance colleague approves." />
    {alert}
    {pending.length > 0 && <section className="ws-sell-card" aria-labelledby="pending-rev"><h2 id="pending-rev">Reversals waiting</h2><ul className="ws-hub-rows">{pending.map((r) => <li key={r.id} className="ws-hub-rows--text">
      <span className="ws-hub-rows__main"><strong>{money(r.amount_minor)} on {r.order_id}</strong><small>{r.reason} · requested by {r.requested_by}, {when.format(r.requested_at)}{needsSecondApprover(r) ? " · needs a second approver" : ""}</small></span>
      <span className="ws-hub-rows__actions"><button type="button" className={buttonClass({ size: "sm" })} onClick={() => decide(r, true)}>Approve</button><button type="button" className={buttonClass({ size: "sm", variant: "quiet" })} onClick={() => decide(r, false)}>Reject</button></span></li>)}</ul></section>}
    <div className="ws-form-field ws-ledger-filter"><label htmlFor="ledger-filter">Filter by order number</label><input id="ledger-filter" type="search" className="ws-input" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
    {rows.length ? <LedgerTable rows={rows} onReverse={(r) => { setReason(""); setReversing(r); }} /> : <p className="ws-form-field__hint">No postings match.</p>}
    {reversing && <Dialog title="Reverse this entry?" close={() => setReversing(null)}>
      <p>Posts {reversing.credit_account} → {reversing.debit_account} for {money(reversing.amount_minor)} on {reversing.order_id}. The original row stays.</p>
      {reversing.amount_minor > rules.admin.reversalApprovalMinor && <p className="ws-sell-tip"><WarningIcon />Over ₦100,000: another finance colleague must approve it.</p>}
      {alert}
      <div className="ws-form-field"><label htmlFor="rev-reason">Reason</label><textarea id="rev-reason" className="ws-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      <div className="ws-order-actions"><button type="button" className={buttonClass({})} onClick={() => act(() => updateAdmin((s) => requestReversal(s, { source: reversing.source, order_id: reversing.order_id, posting: reversing, reason }, uid("RV"), Date.now())), { action: "Requested reversal", target: `${reversing.order_id} ${reversing.id}`, detail: `${money(reversing.amount_minor)} · ${reason}` }, () => setReversing(null))}>Request reversal</button><button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setReversing(null)}>Cancel</button></div>
    </Dialog>}
  </Gate>;
}

/* ---------- A3 RiskRulesTable ---------- */

export function RiskPage() {
  const seller = useSeller(); const { orders } = useOrders(); const deals = useNegotiations(); const now = useNow();
  const [note, setNote] = useState("");
  const { act, alert } = useAct();
  const signals = riskSignals(seller, orders, deals, now);
  const shop = seller.profile ? `shop ${seller.profile.handle}` : "shop";
  return <Gate roles={["finance"]} title="Risk"><Head title="Risk rules" lede="Live signals from this device’s data. Actions are explained to the seller and can be appealed." />
    {alert}
    <table className="ws-table ws-table--ledger"><thead><tr><th scope="col">Signal</th><th scope="col">Rule</th><th scope="col">Hits</th><th scope="col">Detail</th></tr></thead>
      <tbody>{signals.map((s) => <tr key={s.key} data-hit={s.hits > 0 || undefined}><td data-label="Signal"><strong>{s.label}</strong></td><td data-label="Rule">{s.rule}</td><td data-label="Hits" className="ws-num">{s.hits}</td><td data-label="Detail">{s.hits ? s.detail : "—"}</td></tr>)}</tbody></table>
    <section className="ws-sell-card" aria-labelledby="risk-act"><h2 id="risk-act">Act on {seller.profile?.shop_name ?? "the shop"}</h2>
      <p>Payouts: {seller.payout_hold_reason ? `on hold (${seller.payout_hold_reason})` : "normal"} · Shop: {seller.suspended_reason ? "suspended" : "active"}</p>
      <div className="ws-form-field"><label htmlFor="risk-note">Reason the seller will see</label><textarea id="risk-note" className="ws-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="ws-order-actions">
        {seller.payout_hold_reason ? <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => act(() => updateSeller((s) => holdPayouts(s, null)), { action: "Released payout hold", target: shop })}>Release payout hold</button>
          : <button type="button" className={buttonClass({})} onClick={() => act(() => updateSeller((s) => holdPayouts(s, note)), { action: "Held payouts", target: shop, detail: note }, () => setNote(""))}>Hold payouts</button>}
        {!seller.suspended_reason && <button type="button" className={buttonClass({ variant: "danger" })} onClick={() => act(() => updateSeller((s) => suspendSeller(s, note)), { action: "Suspended seller", target: shop, detail: note }, () => setNote(""))}>Suspend shop</button>}
      </div></section>
  </Gate>;
}

/* ---------- A4 SupportConsole (read-only) ---------- */

export function SupportPage() {
  const seller = useSeller(); const { orders } = useOrders();
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<SearchHit | null>(null);
  const hits = supportSearch(q, orders, seller);
  const view = (hit: SearchHit) => { setViewing(hit); logAction({ action: "Viewed (read-only)", target: `${hit.kind.replace("_", " ")} ${hit.id}`, detail: "" }); };
  return <Gate roles={["support"]} title="Support"><Head title="Support console" lede="Search by order, listing or shop. Views are read-only and logged." />
    <div className="ws-form-field"><label htmlFor="support-q">Search</label><input id="support-q" type="search" className="ws-input" placeholder="Order number, item or shop handle" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {q.trim().length >= 2 && (hits.length ? <ul className="ws-hub-rows ws-hub-rows--flush">{hits.map((h) => <li key={`${h.kind}:${h.id}`} className="ws-hub-rows--text"><span className="ws-hub-rows__main"><strong>{h.title}</strong><small>{h.id} · {h.meta}</small></span><span className="ws-hub-rows__actions"><button type="button" className={buttonClass({ size: "sm", variant: "ghost" })} onClick={() => view(h)}>View</button></span></li>)}</ul> : <p className="ws-form-field__hint" role="status">No matches for “{q}”.</p>)}
    {viewing && <SupportView hit={viewing} orders={orders} close={() => setViewing(null)} />}
    <section className="ws-sell-card" aria-labelledby="templates"><h2 id="templates">Reply templates</h2><ul className="ws-hub-rows">{TEMPLATES.map((t) => <li key={t.id} className="ws-hub-rows--text"><span className="ws-hub-rows__main"><strong>{t.label}</strong><small>{t.body}</small></span><span className="ws-hub-rows__actions"><button type="button" className={buttonClass({ size: "sm", variant: "quiet" })} onClick={() => { void navigator.clipboard?.writeText(t.body).catch(() => {}); toast({ message: `Copied “${t.label}”` }); }}>Copy</button></span></li>)}</ul></section>
  </Gate>;
}

function SupportView({ hit, orders, close }: { hit: SearchHit; orders: readonly Order[]; close: () => void }) {
  const seller = useSeller();
  const order = hit.kind === "buyer_order" ? orders.find((o) => o.id === hit.id) : undefined;
  const sOrder = hit.kind === "seller_order" ? seller.orders.find((o) => o.id === hit.id) : undefined;
  const listing = hit.kind === "listing" ? seller.listings.find((l) => l.id === hit.id) : undefined;
  const facts: [string, string][] = order ? [["Status", order.status.replaceAll("_", " ")], ["Escrow", order.escrow_status.replaceAll("_", " ")], ["Total", money(order.total_minor)], ["Seller", order.seller_name], ["Case", order.dispute ? order.dispute.status.replaceAll("_", " ") : "None"]]
    : sOrder ? [["Status", sOrder.status.replaceAll("_", " ")], ["Escrow", sOrder.escrow_status.replaceAll("_", " ")], ["Total", money(sOrder.total_minor)], ["Buyer", `${sOrder.buyer}, ${sOrder.buyer_area}`]]
    : listing ? [["Status", listing.status.replaceAll("_", " ")], ["Price", money(listing.price_minor ?? 0)], ["Quantity", String(listing.qty)], ["Edits logged", String(listing.revisions.length)]]
    : [["Shop", seller.profile?.shop_name ?? ""], ["KYC", seller.kyc.status.replaceAll("_", " ")], ["Payout account", seller.payout?.kind === "bank" ? `${seller.payout.bank} ••${seller.payout.account_last4}` : seller.payout ? "Wallet only" : "None"], ["Suspended", seller.suspended_reason ?? "No"], ["Payout hold", seller.payout_hold_reason ?? "No"]];
  return <Dialog title={`${hit.title} (read-only)`} close={close}>
    <dl className="ws-order-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <div className="ws-order-actions">{order?.dispute && <Link className={buttonClass({ size: "sm" })} href={`/admin/cases/${order.id}`}>Open the case</Link>}<button type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={close}>Close</button></div>
    <p className="ws-form-field__hint">This view was recorded in the audit log.</p>
  </Dialog>;
}

/* ---------- AuditLogTable ---------- */

export function AuditPage() {
  const admin = useAdmin();
  return <Gate roles={["moderation", "disputes", "finance", "support"]} title="Audit log"><Head title="Audit log" lede="Every staff action, newest first. Entries can’t be edited or deleted." />
    {admin.audit.length ? <table className="ws-table ws-table--ledger"><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Detail</th></tr></thead>
      <tbody>{admin.audit.map((a) => <tr key={a.id}><td data-label="When">{when.format(a.at)}</td><td data-label="Who">{a.staff} · {ROLE_LABEL[a.role]}</td><td data-label="Action">{a.action}</td><td data-label="Target">{a.target}</td><td data-label="Detail">{a.detail || "—"}</td></tr>)}</tbody></table>
      : <p className="ws-form-field__hint">No staff actions yet.</p>}
  </Gate>;
}
