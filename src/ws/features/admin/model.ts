import { rules } from "@ws/config/marketplace-rules";
import type { Order } from "@ws/features/orders/model";
import type { State as NegotiationState } from "@ws/features/negotiation/model";
import { sellSimilar } from "@ws/features/sell/hub";
import type { SellerAccount, SellerListing } from "@ws/features/sell/model";
import type { ReportReason } from "@ws/lib/copy/listing";
import { reversePosting, type Posting } from "@ws/lib/ledger";

/*
 * Admin & ops console (flows Part C, A1–A4; Part L ops rules). Device-local like the rest
 * of the demo: staff act on the buyer, seller and negotiation data in this browser.
 * Staff identities and roles are mocks; real access needs SSO and server-side checks.
 * Every action appends an audit entry (§18 Phase 8 acceptance); entries are never edited.
 */

const HOUR = 3_600_000;
export type Role = "moderation" | "disputes" | "finance" | "support";
export const STAFF = [
  { id: "kemi", name: "Kemi Adeyemi", role: "moderation" },
  { id: "tunde", name: "Tunde Bakare", role: "disputes" },
  { id: "ngozi", name: "Ngozi Eze", role: "finance" },
  { id: "ifeanyi", name: "Ifeanyi Obi", role: "finance" },
  { id: "amaka", name: "Amaka Okoro", role: "support" },
] as const satisfies readonly { id: string; name: string; role: Role }[];
export type Staff = (typeof STAFF)[number];
export const ROLE_LABEL: Record<Role, string> = { moderation: "Moderation", disputes: "Disputes", finance: "Finance", support: "Support" };
export const staffById = (id: string | null) => STAFF.find((s) => s.id === id) ?? null;

export type AuditEntry = { id: string; at: number; staff: string; role: Role; action: string; target: string; detail: string };
export type Report = { id: string; listing_id: string; title: string; seller: string; reason: ReportReason; details: string; at: number; status: "open" | "dismissed" | "removed"; resolved_by: string | null };
export type LedgerSource = "buyer_order" | "seller_order";
export type Reversal = { id: string; source: LedgerSource; order_id: string; posting_id: string; amount_minor: number; reason: string; requested_by: string; requested_at: number; status: "pending" | "approved" | "rejected"; decided_by: string | null; decided_at: number | null };
export type AdminState = { staff_id: string | null; audit: AuditEntry[]; reports: Report[]; reversals: Reversal[] };
export const initialAdmin: AdminState = { staff_id: null, audit: [], reports: [], reversals: [] };

function fail(message: string): never { throw new Error(message); }

export function audit(state: AdminState, entry: Omit<AuditEntry, "id" | "staff" | "role">): AdminState {
  const staff = staffById(state.staff_id) ?? fail("Sign in as a staff member first.");
  return { ...state, audit: [{ ...entry, id: `A${state.audit.length + 1}`, staff: staff.name, role: staff.role }, ...state.audit] };
}

/** Role-gated routes: each page names the roles that may use it. */
export function can(state: AdminState, roles: readonly Role[]) {
  const staff = staffById(state.staff_id);
  return staff !== null && roles.includes(staff.role);
}

/* ---------- A1: moderation queue ---------- */

const HIGH_RISK: readonly ReportReason[] = ["prohibited", "counterfeit", "scam"];
export const POLICIES = [
  { code: "PC-01", label: "Prohibited or restricted item" },
  { code: "PC-02", label: "Counterfeit or unverified luxury goods" },
  { code: "PC-03", label: "Misleading photos, price or description" },
  { code: "PC-04", label: "Asks for payment or contact off WorldStore" },
  { code: "PC-05", label: "Duplicate listing" },
] as const;
export type PolicyCode = (typeof POLICIES)[number]["code"];

export type QueueItem =
  | { kind: "review"; id: string; title: string; seller: string; reason: string; at: number; due_at: number; high: boolean; listing: SellerListing }
  | { kind: "report"; id: string; title: string; seller: string; reason: string; at: number; due_at: number; high: boolean; report: Report };

/** Oldest-due first; high-risk items have a 1 h SLA, the rest 24 h (A1). */
export function moderationQueue(admin: AdminState, seller: SellerAccount): QueueItem[] {
  const shop = seller.profile?.shop_name ?? "Your shop";
  const reviews: QueueItem[] = seller.listings.filter((l) => l.status === "in_review").map((l) => ({ kind: "review", id: l.id, title: l.title, seller: shop, reason: l.review_reason || "Automatic check flagged this listing.", at: l.published_at, due_at: l.published_at + rules.moderation.highRiskHours * HOUR, high: true, listing: l }));
  const reports: QueueItem[] = admin.reports.filter((r) => r.status === "open").map((r) => {
    const high = HIGH_RISK.includes(r.reason);
    return { kind: "report", id: r.id, title: r.title, seller: r.seller, reason: r.reason.replaceAll("_", " ") + (r.details ? `: ${r.details}` : ""), at: r.at, due_at: r.at + (high ? rules.moderation.highRiskHours : rules.moderation.reportReviewHours) * HOUR, high, report: r };
  });
  return [...reviews, ...reports].sort((a, b) => a.due_at - b.due_at);
}

export function addReport(state: AdminState, report: Omit<Report, "status" | "resolved_by">): AdminState {
  return { ...state, reports: [{ ...report, status: "open", resolved_by: null }, ...state.reports] };
}

const policy = (code: string) => POLICIES.find((p) => p.code === code) ?? fail("Choose the policy it breaks.");

/** ListingReviewPanel actions on the seller's own listing. */
export function moderateListing(seller: SellerAccount, id: string, action: "approve" | "request_edit" | "remove", detail: string, now: number): SellerAccount {
  const listing = seller.listings.find((l) => l.id === id) ?? fail("Listing not found.");
  if (listing.status !== "in_review" && action !== "remove") fail("This listing isn’t waiting for review.");
  if (action === "approve") return { ...seller, listings: seller.listings.map((l) => l.id === id ? { ...l, status: "live", review_reason: "", updated_at: now } : l) };
  if (action === "remove") {
    const p = policy(detail);
    return { ...seller, listings: seller.listings.map((l) => l.id === id ? { ...l, status: "removed", promotion: null, review_reason: `Removed for ${p.code}: ${p.label}. You can appeal within ${rules.disputes.appealDays} days.`, updated_at: now } : l) };
  }
  if (detail.trim().length < 10) fail("Tell the seller what to change (at least 10 characters).");
  const copied = sellSimilar(seller, id, id, now);
  return { ...copied, listings: copied.listings.filter((l) => l.id !== id), drafts: copied.drafts.map((d) => d.id === id ? { ...d, serial: listing.serial, created_at: listing.created_at, step: 7, max_step: 7, admin_note: detail.trim() } : d) };
}

export function suspendSeller(seller: SellerAccount, reason: string): SellerAccount {
  if (reason.trim().length < 10) fail("Give the reason the seller will see (at least 10 characters).");
  return { ...seller, suspended_reason: reason.trim(), listings: seller.listings.map((l) => l.status === "live" || l.status === "paused" ? { ...l, status: "ended", promotion: null } : l) };
}

export function resolveReport(state: AdminState, id: string, status: "dismissed" | "removed"): AdminState {
  const staff = staffById(state.staff_id) ?? fail("Sign in as a staff member first.");
  return { ...state, reports: state.reports.map((r) => r.id === id ? { ...r, status, resolved_by: staff.name } : r) };
}

/* ---------- A2: cases ---------- */

/** Ops decision due 3 business days after the seller window (L8 step 7), counted here as 72 h. */
export const opsDueAt = (order: Order) => order.dispute ? order.dispute.seller_due_at + rules.disputes.opsSlaBusinessDays * 24 * HOUR : null;

/* ---------- LedgerViewer + reversals (R-260, R-261) ---------- */

export type LedgerRow = Posting & { source: LedgerSource; title: string };

export function requestReversal(state: AdminState, input: { source: LedgerSource; order_id: string; posting: Posting; reason: string }, id: string, now: number): AdminState {
  const staff = staffById(state.staff_id) ?? fail("Sign in as a staff member first.");
  if (staff.role !== "finance") fail("Only finance staff can reverse ledger entries.");
  if (input.reason.trim().length < 10) fail("Give a reason of at least 10 characters.");
  if (state.reversals.some((r) => r.posting_id === input.posting.id && r.order_id === input.order_id && r.status !== "rejected")) fail("A reversal for this entry already exists.");
  const reversal: Reversal = { id, source: input.source, order_id: input.order_id, posting_id: input.posting.id, amount_minor: input.posting.amount_minor, reason: input.reason.trim(), requested_by: staff.name, requested_at: now, status: "pending", decided_by: null, decided_at: null };
  return { ...state, reversals: [reversal, ...state.reversals] };
}

/** Below the threshold the requester's own request is enough; above it a different finance person must approve. */
export const needsSecondApprover = (r: Reversal) => r.amount_minor > rules.admin.reversalApprovalMinor;

export function decideReversal(state: AdminState, id: string, approve: boolean, now: number): AdminState {
  const staff = staffById(state.staff_id) ?? fail("Sign in as a staff member first.");
  const r = state.reversals.find((x) => x.id === id) ?? fail("Reversal not found.");
  if (r.status !== "pending") fail("This reversal has already been decided.");
  if (staff.role !== "finance") fail("Only finance staff can approve reversals.");
  if (approve && needsSecondApprover(r) && staff.name === r.requested_by) fail("Reversals over ₦100,000 need a second person. Ask another finance colleague to approve.");
  return { ...state, reversals: state.reversals.map((x) => x.id === id ? { ...x, status: approve ? "approved" : "rejected", decided_by: staff.name, decided_at: now } : x) };
}

/** Applies an approved reversal to one of the seller's order ledgers. */
export function reverseSellerPosting(seller: SellerAccount, orderId: string, postingId: string, reason: string, now: number): SellerAccount {
  const order = seller.orders.find((o) => o.id === orderId) ?? fail("Order not found.");
  return { ...seller, orders: seller.orders.map((o) => o.id === orderId ? { ...o, ledger: reversePosting(order.ledger, postingId, now, reason) } : o) };
}

/* ---------- A3: risk signals ---------- */

export type RiskSignal = { key: string; label: string; rule: string; hits: number; detail: string; action: "hold_payouts" | "suspend" | "review" | "none" };

export function riskSignals(seller: SellerAccount, orders: readonly Order[], deals: NegotiationState, now: number): RiskSignal[] {
  const isNew = seller.orders.filter((o) => o.released_at !== null).length < rules.escrow.payoutDelay.new.firstOrders;
  const highValue = seller.listings.filter((l) => (l.status === "live" || l.status === "in_review") && (l.price_minor ?? 0) > rules.escrow.highValueMinor);
  const cancels = seller.orders.filter((o) => o.seller_fault && now - o.created_at < 90 * 24 * HOUR).length;
  const offPlatform = deals.threads.flatMap((t) => t.messages).filter((m) => m.flagged).length;
  const refundFails = orders.filter((o) => o.escrow_status === "refund_failed").length;
  return [
    { key: "new_high_value", label: "New seller, high-value listing", rule: `New seller with a listing over ₦${(rules.escrow.highValueMinor / 100).toLocaleString("en-NG")}`, hits: isNew ? highValue.length : 0, detail: highValue.map((l) => l.title).join(", "), action: "hold_payouts" },
    { key: "cancellations", label: "Repeated cancellations", rule: "2 or more seller-fault cancellations in 90 days", hits: cancels >= 2 ? cancels : 0, detail: `${cancels} seller-fault cancellation${cancels === 1 ? "" : "s"}`, action: "hold_payouts" },
    { key: "off_platform", label: "Off-platform payment attempts", rule: "Messages asking to pay or talk outside WorldStore (R-051)", hits: offPlatform, detail: `${offPlatform} flagged message${offPlatform === 1 ? "" : "s"}`, action: "suspend" },
    { key: "bank_change", label: "Payout account changed", rule: "Bank change: 24 h withdrawal hold (R-270)", hits: seller.withdraw_hold_until !== null && now < seller.withdraw_hold_until ? 1 : 0, detail: "Automatic hold in place", action: "none" },
    { key: "refund_failed", label: "Failed refunds", rule: "Refund to the buyer bounced; ops task after 48 h (L9)", hits: refundFails, detail: `${refundFails} order${refundFails === 1 ? "" : "s"}`, action: "review" },
  ];
}

export function holdPayouts(seller: SellerAccount, reason: string | null): SellerAccount {
  if (reason !== null && reason.trim().length < 10) fail("Give the reason the seller will see (at least 10 characters).");
  return { ...seller, payout_hold_reason: reason?.trim() ?? null };
}

/* ---------- A4: support search ---------- */

export type SearchHit = { kind: "buyer_order" | "seller_order" | "listing" | "shop"; id: string; title: string; meta: string };

export function supportSearch(query: string, orders: readonly Order[], seller: SellerAccount): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const has = (...values: string[]) => values.some((v) => v.toLowerCase().includes(q));
  return [
    ...orders.filter((o) => has(o.id, o.title, o.seller_name)).map((o): SearchHit => ({ kind: "buyer_order", id: o.id, title: o.title, meta: `Buyer order · ${o.status.replaceAll("_", " ")} · ${o.seller_name}` })),
    ...seller.orders.filter((o) => has(o.id, o.title, o.buyer_area)).map((o): SearchHit => ({ kind: "seller_order", id: o.id, title: o.title, meta: `Seller order · ${o.status.replaceAll("_", " ")} · buyer ${o.buyer}` })),
    ...seller.listings.filter((l) => has(l.id, l.title)).map((l): SearchHit => ({ kind: "listing", id: l.id, title: l.title, meta: `Listing · ${l.status.replaceAll("_", " ")}` })),
    ...(seller.profile && has(seller.profile.handle, seller.profile.shop_name) ? [{ kind: "shop" as const, id: seller.profile.handle, title: seller.profile.shop_name, meta: `Shop @${seller.profile.handle} · KYC ${seller.kyc.status.replaceAll("_", " ")}` }] : []),
  ].slice(0, 20);
}

export const TEMPLATES = [
  { id: "escrow", label: "Where is my money?", body: "Your payment is held safely by WorldStore. It goes to the seller only after you confirm the item arrived as described, or when the inspection window ends without a problem report." },
  { id: "offplatform", label: "Off-platform warning", body: "For your protection, please keep payments and conversations on WorldStore. Payments made outside the app aren’t covered by escrow or Buyer Protection." },
  { id: "case", label: "Case received", body: "Thanks for the details. Your case is open and the money for this order is frozen until it’s resolved. We’ll update you within 3 business days." },
] as const;

/* ---------- persisted state ---------- */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown, max = 600) => typeof v === "string" && v.length <= max;
const isTime = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0;
const ROLES = ["moderation", "disputes", "finance", "support"];

export function parseAdmin(raw: unknown): AdminState {
  if (!isRecord(raw) || !Array.isArray(raw.audit) || !Array.isArray(raw.reports) || !Array.isArray(raw.reversals)) throw new Error("Invalid admin state");
  const ok = (raw.staff_id === null || staffById(raw.staff_id as string) !== null)
    && raw.audit.every((a) => isRecord(a) && isText(a.id, 20) && isTime(a.at) && isText(a.staff, 80) && ROLES.includes(a.role as string) && isText(a.action, 80) && isText(a.target, 200) && isText(a.detail))
    && raw.reports.every((r) => isRecord(r) && isText(r.id, 60) && isText(r.listing_id, 40) && isText(r.title, 200) && isText(r.seller, 120) && isText(r.reason, 40) && isText(r.details) && isTime(r.at) && ["open", "dismissed", "removed"].includes(r.status as string) && (r.resolved_by === null || isText(r.resolved_by, 80)))
    && raw.reversals.every((r) => isRecord(r) && isText(r.id, 60) && (r.source === "buyer_order" || r.source === "seller_order") && isText(r.order_id, 40) && isText(r.posting_id, 80) && Number.isSafeInteger(r.amount_minor) && (r.amount_minor as number) > 0 && isText(r.reason) && isText(r.requested_by, 80) && isTime(r.requested_at) && ["pending", "approved", "rejected"].includes(r.status as string) && (r.decided_by === null || isText(r.decided_by, 80)) && (r.decided_at === null || isTime(r.decided_at)));
  if (!ok) throw new Error("Invalid admin state");
  return raw as AdminState;
}
