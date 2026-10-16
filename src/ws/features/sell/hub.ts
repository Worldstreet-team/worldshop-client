import { rules } from "@ws/config/marketplace-rules";
import { AREAS } from "@ws/lib/areas";
import type { DeliveryMethod } from "@ws/lib/data/types";
import { assertLedgerInvariant, balances, captureToEscrow, createLedger, post, refundToBuyer, releaseToSeller, type Ledger } from "@ws/lib/ledger";
import { ESCROW_STATUSES, nextEscrow, type EscrowStatus } from "@ws/lib/machines/escrow";
import { nextOrder, ORDER_STATUSES, type OrderStatus } from "@ws/lib/machines/order";
import { toMinor } from "@ws/lib/money";
import { newDraft, type SellerAccount, type SellerListing } from "./model";

/*
 * Seller Hub (flows S3, S5, S6, S7) over the same device-local account as onboarding.
 * Orders reuse the order/escrow machines and the double-entry ledger from Phase 6, so a
 * seller's money moves held → pending → available → withdrawn exactly as buyers see it.
 * Buyers can't reach a device-local listing, so a labelled demo action simulates one.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type Dispatch =
  | { kind: "platform"; courier: string; tracking: string }
  | { kind: "own"; rider_name: string; rider_phone: string; eta: string }
  | { kind: "meet_up"; place: string; pin: string };
export type SellerOrder = {
  id: string; listing_id: string; title: string; photo: string; buyer: string; buyer_area: string;
  qty: number; unit_minor: number; delivery_method: DeliveryMethod; delivery_minor: number; total_minor: number;
  status: OrderStatus; escrow_status: EscrowStatus; created_at: number; confirm_due_at: number; dispatch_due_at: number;
  dispatched_at: number | null; dispatch: Dispatch | null; delivered_at: number | null; released_at: number | null;
  cancel_reason: string; seller_fault: boolean; events: { at: number; label: string }[]; ledger: Ledger;
  /** Ad rate if the listing was promoted when it sold (attributed to the promotion in this demo). */
  promotion_rate: number | null;
};
export type Withdrawal = { id: string; amount_minor: number; at: number; status: "paid" | "failed"; reason: string; bank: string };

export const COURIERS = ["GIG Logistics", "Kwik", "DHL Nigeria", "Sendbox"] as const;
export const CANCEL_REASONS = ["Out of stock", "Item damaged before dispatch", "Buyer unreachable", "Other"] as const;
const BUYERS = ["o***a", "c***i", "t***e", "a***u", "k***n"];

function fail(message: string): never { throw new Error(message); }
const find = (account: SellerAccount, id: string) => account.orders.find((o) => o.id === id) ?? fail("Order not found.");
const withOrder = (account: SellerAccount, order: SellerOrder): SellerAccount => ({ ...account, orders: account.orders.map((o) => o.id === order.id ? order : o) });
const withListing = (account: SellerAccount, id: string, patch: (l: SellerListing) => SellerListing): SellerAccount => ({ ...account, listings: account.listings.map((l) => l.id === id ? patch(l) : l) });

/* ---------- S3: managing listings ---------- */

/** Inline price/quantity edits, allowed any time and logged (R-112). Stock back above 0 reactivates (R-121). */
export function editListing(account: SellerAccount, id: string, patch: { price_minor?: number; qty?: number }, now: number): SellerAccount {
  const listing = account.listings.find((l) => l.id === id) ?? fail("Listing not found.");
  if (listing.status === "ended" || listing.status === "removed") fail(listing.status === "removed" ? "This listing was removed by WorldStore and can’t be edited." : "Relist this item before editing it.");
  const revisions = [...listing.revisions];
  let { price_minor, qty, status } = listing;
  if (patch.price_minor !== undefined && patch.price_minor !== price_minor) {
    if (!Number.isSafeInteger(patch.price_minor) || patch.price_minor < toMinor(100)) fail("Enter a price of at least ₦100.");
    revisions.push({ at: now, field: "price", from: price_minor ?? 0, to: patch.price_minor });
    price_minor = patch.price_minor;
  }
  if (patch.qty !== undefined && patch.qty !== qty) {
    if (!Number.isSafeInteger(patch.qty) || patch.qty < 0 || patch.qty > 999) fail("Enter a quantity from 0 to 999.");
    revisions.push({ at: now, field: "qty", from: qty, to: patch.qty });
    qty = patch.qty;
    if (qty === 0 && status === "live") status = "paused";
    if (qty > 0 && status === "paused") status = "live";
  }
  if (revisions.length === listing.revisions.length) return account;
  const offers = listing.offers_enabled && price_minor !== null ? { auto_accept_minor: listing.auto_accept_minor !== null && listing.auto_accept_minor > price_minor ? price_minor : listing.auto_accept_minor, auto_decline_minor: listing.auto_decline_minor !== null && listing.auto_decline_minor >= price_minor ? null : listing.auto_decline_minor } : {};
  return withListing(account, id, (l) => ({ ...l, ...offers, price_minor, qty, status, revisions, updated_at: now }));
}

/** Bulk "change price by %", rounded to whole naira. */
export function bulkPrice(account: SellerAccount, ids: readonly string[], percent: number, now: number) {
  if (!Number.isFinite(percent) || percent <= -90 || percent > 500 || percent === 0) fail("Enter a change between −90% and +500%.");
  return ids.reduce((a, id) => {
    const l = a.listings.find((x) => x.id === id);
    if (!l || l.price_minor === null || l.status === "ended" || l.status === "removed") return a;
    return editListing(a, id, { price_minor: Math.max(toMinor(100), Math.round(l.price_minor * (1 + percent / 100) / 100) * 100) }, now);
  }, account);
}

/** R-120: an item with orders still to ship can't be ended. */
export function endListing(account: SellerAccount, id: string, now: number) {
  const listing = account.listings.find((l) => l.id === id) ?? fail("Listing not found.");
  if (listing.status === "ended" || listing.status === "removed") return account;
  if (account.orders.some((o) => o.listing_id === id && ["paid", "preparing"].includes(o.status))) fail(`“${listing.title}” has an order to ship. Ship or cancel it first.`);
  return withListing(account, id, (l) => ({ ...l, status: "ended", promotion: null, updated_at: now }));
}

/** Relisting restarts the 30-day run (R-115); an out-of-stock item comes back paused. */
export function relist(account: SellerAccount, id: string, now: number) {
  const listing = account.listings.find((l) => l.id === id) ?? fail("Listing not found.");
  if (listing.status !== "ended") fail("Only ended listings can be relisted.");
  return withListing(account, id, (l) => ({ ...l, status: l.qty > 0 ? "live" : "paused", published_at: now, updated_at: now }));
}

/** "Sell similar": a new draft with everything but the identifiers. */
export function sellSimilar(account: SellerAccount, id: string, draftId: string, now: number) {
  const l = account.listings.find((x) => x.id === id) ?? fail("Listing not found.");
  const { photos, category_id, specifics, condition, flaws, title, description, price_minor, qty, offers_enabled, auto_accept_minor, auto_decline_minor, delivery, package: size, return_days, return_payer } = l;
  const draft = { ...newDraft(draftId, now), photos, category_id, specifics, condition, flaws, serial: "", title, description, price_minor, qty: Math.max(1, qty), offers_enabled, auto_accept_minor, auto_decline_minor, delivery, package: size, return_days, return_payer };
  return { ...account, drafts: [...account.drafts, draft] };
}

/** Promoted listings: ad rate in whole percent within the configured band. */
export const promotionFee = (itemMinor: number, ratePercent: number) => Math.floor(itemMinor * ratePercent / 100);

export function promote(account: SellerAccount, ids: readonly string[], ratePercent: number, now: number): SellerAccount {
  const { minRatePercent: min, maxRatePercent: max } = rules.promotions;
  if (!Number.isSafeInteger(ratePercent) || ratePercent < min || ratePercent > max) fail(`Choose an ad rate from ${min}% to ${max}%.`);
  if (account.suspended_reason) fail("A suspended shop can’t promote listings.");
  const eligible = ids.filter((id) => account.listings.some((l) => l.id === id && (l.status === "live" || l.status === "paused")));
  if (!eligible.length) fail("Only live listings can be promoted.");
  return { ...account, listings: account.listings.map((l) => eligible.includes(l.id) ? { ...l, promotion: { rate_percent: ratePercent, since: l.promotion?.since ?? now }, updated_at: now } : l) };
}

export function stopPromotion(account: SellerAccount, ids: readonly string[], now: number): SellerAccount {
  return { ...account, listings: account.listings.map((l) => ids.includes(l.id) && l.promotion ? { ...l, promotion: null, updated_at: now } : l) };
}

/* ---------- S5: orders ---------- */

/** Demo stand-in for a buyer paying a payment request on this listing (escrow captured). */
export function simulatePurchase(account: SellerAccount, listingId: string, id: string, now: number): SellerAccount {
  const listing = account.listings.find((l) => l.id === listingId) ?? fail("Listing not found.");
  if (listing.status !== "live" || listing.qty < 1 || listing.price_minor === null) fail("Only a live listing with stock can be bought.");
  if (account.orders.some((o) => o.id === id)) fail("That order number is already used. Try again.");
  const choice = listing.delivery[0] ?? fail("This listing has no delivery option.");
  const total = listing.price_minor + choice.fee_minor;
  const n = account.orders.length;
  const area = AREAS[(n * 7 + 3) % AREAS.length];
  const handlingHours = choice.handling_days === 0 ? 12 : choice.handling_days * 24;
  const order: SellerOrder = {
    id, listing_id: listing.id, title: listing.title, photo: listing.photos[0]?.url ?? "", buyer: BUYERS[n % BUYERS.length], buyer_area: `${area.label}, ${area.city}`,
    qty: 1, unit_minor: listing.price_minor, delivery_method: choice.method, delivery_minor: choice.fee_minor, total_minor: total,
    status: nextOrder("payment_pending", "pay"), escrow_status: nextEscrow("awaiting_payment", "capture"), created_at: now,
    confirm_due_at: now + rules.orders.sellerConfirmHours * HOUR, dispatch_due_at: now + handlingHours * HOUR,
    dispatched_at: null, dispatch: null, delivered_at: null, released_at: null, cancel_reason: "", seller_fault: false, promotion_rate: listing.promotion?.rate_percent ?? null,
    events: [{ at: now, label: "Buyer paid · money held in escrow" }], ledger: captureToEscrow(createLedger(id, total), `${id}:capture`, now),
  };
  const qty = listing.qty - 1;
  return { ...withListing(account, listingId, (l) => ({ ...l, qty, status: qty === 0 ? "paused" : l.status, updated_at: now })), orders: [order, ...account.orders] };
}

export function confirmOrder(account: SellerAccount, id: string, now: number) {
  const o = find(account, id);
  return withOrder(account, { ...o, status: nextOrder(o.status, "prepare"), events: [...o.events, { at: now, label: "Order confirmed · preparing" }] });
}

export function dispatchOrder(account: SellerAccount, id: string, input: { kind: "platform"; courier: string } | { kind: "own"; rider_name: string; rider_phone: string; eta: string } | { kind: "meet_up"; place: string }, now: number) {
  const o = find(account, id);
  if (o.status !== "preparing") fail("Confirm the order before dispatching it.");
  let dispatch: Dispatch;
  if (input.kind === "platform") {
    if (!COURIERS.includes(input.courier as (typeof COURIERS)[number])) fail("Choose a courier.");
    dispatch = { kind: "platform", courier: input.courier, tracking: `${input.courier.slice(0, 3).toUpperCase()}-${o.id.slice(-6).toUpperCase()}` };
  } else if (input.kind === "own") {
    if (o.total_minor > rules.tracking.requiredAboveMinor) fail("Orders over ₦20,000 need tracking: use a courier, or meet up with a handover PIN."); // R-141
    if (input.rider_name.trim().length < 2) fail("Enter the rider’s name.");
    if (!/^\+?\d{10,14}$/.test(input.rider_phone.replace(/[\s-]/g, ""))) fail("Enter the rider’s phone number.");
    if (!input.eta.trim()) fail("Say when it will arrive.");
    dispatch = { kind: "own", rider_name: input.rider_name.trim(), rider_phone: input.rider_phone.replace(/[\s-]/g, ""), eta: input.eta.trim() };
  } else {
    if (input.place.trim().length < 3) fail("Agree a public meeting place with the buyer first.");
    dispatch = { kind: "meet_up", place: input.place.trim(), pin: String(1000 + (Number.parseInt(o.id.replace(/\D/g, "").slice(-4) || "0", 10) % 9000)) };
  }
  const late = now > o.dispatch_due_at; // R-140: recorded as a late-dispatch defect
  return withOrder(account, { ...o, status: nextOrder(o.status, "dispatch"), dispatch, dispatched_at: now, events: [...o.events, { at: now, label: late ? "Dispatched late · buyer notified" : "Dispatched · buyer notified" }] });
}

/** Demo: the courier delivers (rider scan or handover PIN). */
export function simulateDelivery(account: SellerAccount, id: string, now: number) {
  const o = find(account, id);
  const status = nextOrder(nextOrder(nextOrder(o.status, "transit"), "out_for_delivery"), "deliver");
  return withOrder(account, { ...o, status, delivered_at: now, events: [...o.events, { at: now, label: "Delivered · buyer is checking the item" }] });
}

/** Demo: the buyer confirms receipt; fees are taken and the rest moves to pending (R-152). */
export function simulateBuyerConfirm(account: SellerAccount, id: string, now: number) {
  const o = find(account, id);
  const status = nextOrder(o.status, "confirm");
  let ledger = releaseToSeller(o.ledger, o.unit_minor * o.qty, o.delivery_minor, `${o.id}:release`, now);
  const adFee = o.promotion_rate ? promotionFee(o.unit_minor * o.qty, o.promotion_rate) : 0;
  if (adFee) ledger = post(ledger, { idempotency_key: `${o.id}:promotion`, debit_account: "seller_pending", credit_account: "platform_revenue", amount_minor: adFee, reason_code: "promotion_fee", actor: "system", created_at: now });
  return withOrder(account, { ...o, status, escrow_status: nextEscrow(nextEscrow(o.escrow_status, "eligible"), "release"), ledger, released_at: now, events: [...o.events, { at: now, label: "Buyer confirmed · payment released to you" }] });
}

/** Seller cancellation: reason required, buyer refunded in full, stock restored. Counts as seller fault unless the buyer was unreachable. */
export function cancelOrder(account: SellerAccount, id: string, reason: string, now: number) {
  const o = find(account, id);
  if (!["paid", "preparing"].includes(o.status)) fail("Only orders that haven’t been dispatched can be cancelled.");
  if (!CANCEL_REASONS.includes(reason as (typeof CANCEL_REASONS)[number])) fail("Choose a reason.");
  const ledger = refundToBuyer(o.ledger, o.total_minor, `${o.id}:cancel`, now);
  const order: SellerOrder = { ...o, status: nextOrder(nextOrder(o.status, "cancel"), "refund"), escrow_status: nextEscrow(nextEscrow(o.escrow_status, "cancel"), "refund_confirm"), ledger, cancel_reason: reason, seller_fault: reason !== "Buyer unreachable", events: [...o.events, { at: now, label: `Cancelled: ${reason} · buyer refunded` }] };
  const restocked = withListing(account, o.listing_id, (l) => ({ ...l, qty: l.qty + o.qty, status: l.status === "paused" ? "live" : l.status, updated_at: now }));
  return withOrder(restocked, order);
}

/* ---------- S6: payouts ---------- */

/** New sellers' payout tier (L4): delay, plus a reserve on the first orders. */
function tier(account: SellerAccount) {
  const completed = account.orders.filter((o) => o.released_at !== null).length;
  return completed <= rules.escrow.payoutDelay.new.firstOrders ? rules.escrow.payoutDelay.new : { ...rules.escrow.payoutDelay.standard, firstOrders: 0 };
}
const reserveOf = (o: SellerOrder, percent: number) => Math.floor(balances(o.ledger).seller_pending * percent / 100);

/** Moves pending → available once the payout delay and reserve period pass. Idempotent. */
export function reconcilePayouts(account: SellerAccount, now: number): SellerAccount {
  const t = tier(account);
  let changed = false;
  const orders = account.orders.map((o) => {
    if (o.released_at === null) return o;
    let ledger = o.ledger;
    const pending = balances(ledger).seller_pending;
    if (!pending) return o;
    const reserve = ledger.receipts[`${o.id}:available`] ? 0 : reserveOf(o, t.reservePercent);
    if (now >= o.released_at + t.delayHours * HOUR && !ledger.receipts[`${o.id}:available`]) {
      ledger = post(ledger, { idempotency_key: `${o.id}:available`, debit_account: "seller_pending", credit_account: "seller_available", amount_minor: pending - reserve, reason_code: "payout_available", actor: "system", created_at: now });
    }
    const left = balances(ledger).seller_pending;
    if (left && ledger.receipts[`${o.id}:available`] && now >= o.released_at + t.reserveDays * DAY) {
      ledger = post(ledger, { idempotency_key: `${o.id}:reserve`, debit_account: "seller_pending", credit_account: "seller_available", amount_minor: left, reason_code: "reserve_released", actor: "system", created_at: now });
    }
    if (ledger === o.ledger) return o;
    changed = true;
    return { ...o, ledger, escrow_status: o.escrow_status === "seller_pending" ? nextEscrow(o.escrow_status, "payout_available") : o.escrow_status };
  });
  return changed ? { ...account, orders } : account;
}

/** BalanceBreakdown: every figure is a sum of ledger balances. */
export function wallet(account: SellerAccount) {
  const sum = (key: "escrow_held" | "escrow_frozen" | "seller_pending" | "seller_available" | "seller_withdrawn") => account.orders.reduce((total, o) => total + balances(o.ledger)[key], 0);
  return { in_escrow: sum("escrow_held"), held: sum("escrow_frozen"), pending: sum("seller_pending"), available: sum("seller_available"), withdrawn: sum("seller_withdrawn") };
}

/** WithdrawFlow (S6, R-153, R-270). The demo provider result decides paid or failed; a failure leaves the money available. */
export function withdraw(account: SellerAccount, amount: number, otp: string, outcome: "paid" | "failed", id: string, now: number): SellerAccount {
  const payout = account.payout;
  if (payout?.kind !== "bank") fail("Add a bank account to withdraw. Wallet-only earnings stay in your WorldStore balance.");
  if (account.payout_hold_reason) fail(`Payouts are on hold: ${account.payout_hold_reason} Contact support to resolve it.`);
  if (account.withdraw_hold_until !== null && now < account.withdraw_hold_until) fail("Withdrawals are on hold for 24 hours after a bank account change, to protect you.");
  if (!Number.isSafeInteger(amount) || amount < rules.fees.minWithdrawalMinor) fail("The minimum withdrawal is ₦1,000.");
  if (amount > wallet(account).available) fail("That’s more than your available balance.");
  if (otp !== DEMO_OTP) fail("That code isn’t right. Check the latest code and try again.");
  const bank = `${payout.bank} ••${payout.account_last4}`;
  if (outcome === "failed") return { ...account, withdrawals: [{ id, amount_minor: amount, at: now, status: "failed", reason: "The bank rejected the transfer. Your money is back in your available balance.", bank }, ...account.withdrawals] };
  let left = amount;
  const orders = [...account.orders].sort((a, b) => (a.released_at ?? 0) - (b.released_at ?? 0)).map((o) => {
    const take = Math.min(left, balances(o.ledger).seller_available);
    if (!take) return o;
    left -= take;
    const ledger = post(o.ledger, { idempotency_key: `${id}:${o.id}`, debit_account: "seller_available", credit_account: "seller_withdrawn", amount_minor: take, reason_code: "withdrawal", actor: "user", created_at: now });
    const b = balances(ledger);
    return { ...o, ledger, escrow_status: !b.seller_available && !b.seller_pending && o.escrow_status === "seller_available" ? nextEscrow(o.escrow_status, "withdraw") : o.escrow_status };
  });
  const byId = new Map(orders.map((o) => [o.id, o]));
  return { ...account, orders: account.orders.map((o) => byId.get(o.id)!), withdrawals: [{ id, amount_minor: amount, at: now, status: "paid", reason: "", bank }, ...account.withdrawals] };
}
/** Step-up check before a withdrawal; a real build sends it by SMS. */
export const DEMO_OTP = "246810";

/** LedgerEntryTable rows, newest first. */
export function ledgerRows(account: SellerAccount) {
  return account.orders.flatMap((o) => o.ledger.postings.map((p) => ({ ...p, title: o.title }))).sort((a, b) => b.created_at - a.created_at);
}

/* ---------- S7: performance ---------- */

export type Metric = { key: string; label: string; value: number | null; target: number; unit: "%" | "h" | "★"; better: "lower" | "higher"; help: string };

export function performance(account: SellerAccount, now: number) {
  const recent = account.orders.filter((o) => now - o.created_at <= 90 * DAY);
  const dispatched = recent.filter((o) => o.dispatched_at !== null);
  const late = dispatched.filter((o) => o.dispatched_at! > o.dispatch_due_at).length;
  const pct = (n: number, d: number) => d ? Math.round(n / d * 1000) / 10 : null;
  const metrics: Metric[] = [
    { key: "late", label: "Late dispatch", value: pct(late, dispatched.length), target: 5, unit: "%", better: "lower", help: "Set a handling time you can always meet, and dispatch the same day when you can." },
    { key: "cancel", label: "Seller-fault cancellations", value: pct(recent.filter((o) => o.seller_fault).length, recent.length), target: 2, unit: "%", better: "lower", help: "Keep quantities accurate. Set an item to 0 the moment it sells elsewhere." },
    { key: "nad", label: "Not as described", value: recent.length ? 0 : null, target: 3, unit: "%", better: "lower", help: "Photograph flaws and describe condition honestly." },
    { key: "dispute", label: "Disputes", value: recent.length ? 0 : null, target: 3, unit: "%", better: "lower", help: "Reply to problems quickly and offer a fair fix before a case opens." },
  ];
  const completed = account.orders.filter((o) => o.released_at !== null).length;
  const failing = metrics.filter((m) => m.value !== null && m.value > m.target);
  // R-160: the first 10 orders are a protection window; R-161: everything shown is explained.
  const level = completed < rules.escrow.payoutDelay.new.firstOrders ? "New" : failing.length ? "Below standard" : "Standard";
  return { level, metrics, orders: recent.length, completed, failing: failing.length };
}

/* ---------- persisted state ---------- */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown, max = 400) => typeof v === "string" && v.length <= max;
const isTime = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0;
const isMoney = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
const timeOrNull = (v: unknown) => v === null || isTime(v);

function validDispatch(d: unknown) {
  if (d === null) return true;
  if (!isRecord(d)) return false;
  if (d.kind === "platform") return isText(d.courier, 40) && isText(d.tracking, 40);
  if (d.kind === "own") return isText(d.rider_name, 80) && isText(d.rider_phone, 20) && isText(d.eta, 80);
  return d.kind === "meet_up" && isText(d.place, 120) && isText(d.pin, 6);
}

export function validOrder(o: unknown) {
  if (!isRecord(o) || !isRecord(o.ledger) || !Array.isArray(o.ledger.postings) || !isRecord(o.ledger.receipts)) return false;
  const shape = isText(o.id, 40) && isText(o.listing_id, 40) && isText(o.title, 200) && isText(o.photo, 2_000_000) && (o.photo === "" || /^data:image\//.test(o.photo as string)) && isText(o.buyer, 20) && isText(o.buyer_area, 80)
    && Number.isSafeInteger(o.qty) && (o.qty as number) > 0 && isMoney(o.unit_minor) && isMoney(o.delivery_minor) && o.total_minor === (o.unit_minor as number) * (o.qty as number) + (o.delivery_minor as number)
    && ["rider", "pickup_station", "meet_up", "courier"].includes(o.delivery_method as string) && ORDER_STATUSES.includes(o.status as OrderStatus) && ESCROW_STATUSES.includes(o.escrow_status as EscrowStatus)
    && isTime(o.created_at) && isTime(o.confirm_due_at) && isTime(o.dispatch_due_at) && timeOrNull(o.dispatched_at) && timeOrNull(o.delivered_at) && timeOrNull(o.released_at)
    && validDispatch(o.dispatch) && (o.promotion_rate === null || (Number.isSafeInteger(o.promotion_rate) && (o.promotion_rate as number) > 0 && (o.promotion_rate as number) <= 100)) && isText(o.cancel_reason, 80) && typeof o.seller_fault === "boolean" && Array.isArray(o.events) && o.events.every((e) => isRecord(e) && isTime(e.at) && isText(e.label, 200))
    && o.ledger.order_id === o.id && o.ledger.captured_minor === o.total_minor;
  if (!shape) return false;
  try { return assertLedgerInvariant(o.ledger as Ledger); } catch { return false; }
}

export function validWithdrawal(w: unknown) {
  return isRecord(w) && isText(w.id, 60) && isMoney(w.amount_minor) && isTime(w.at) && (w.status === "paid" || w.status === "failed") && isText(w.reason, 200) && isText(w.bank, 60);
}

/* ---------- AnalyticsDashboard ---------- */

const lagosDay = new Intl.DateTimeFormat("en-CA", { timeZone: rules.time.zone }); // YYYY-MM-DD

/** Sales figures from this shop's own orders and ledgers. Views and impressions need event tracking, so they aren't shown. */
export function analytics(account: SellerAccount, now: number, days = 30) {
  const from = now - days * DAY;
  const recent = account.orders.filter((o) => o.created_at >= from && o.created_at <= now);
  const sold = recent.filter((o) => !["cancelled", "refunded"].includes(o.status));
  const sum = (orders: readonly SellerOrder[], f: (o: SellerOrder) => number) => orders.reduce((t, o) => t + f(o), 0);
  const posted = (o: SellerOrder, code: string) => o.ledger.postings.filter((p) => p.reason_code === code).reduce((t, p) => t + p.amount_minor, 0);
  const gross = sum(sold, (o) => o.total_minor);
  const daily = Array.from({ length: days }, (_, i) => {
    const day = lagosDay.format(now - (days - 1 - i) * DAY);
    const onDay = sold.filter((o) => lagosDay.format(o.created_at) === day);
    return { day, orders: onDay.length, gross_minor: sum(onDay, (o) => o.total_minor) };
  });
  const byListing = new Map<string, { title: string; units: number; gross_minor: number; promoted: boolean }>();
  for (const o of sold) {
    const row = byListing.get(o.listing_id) ?? { title: o.title, units: 0, gross_minor: 0, promoted: false };
    byListing.set(o.listing_id, { ...row, units: row.units + o.qty, gross_minor: row.gross_minor + o.total_minor, promoted: row.promoted || o.promotion_rate !== null });
  }
  return {
    days,
    gross_minor: gross,
    orders: sold.length,
    average_minor: sold.length ? Math.round(gross / sold.length) : 0,
    earned_minor: sum(recent, (o) => { const b = balances(o.ledger); return b.seller_pending + b.seller_available + b.seller_withdrawn; }),
    fees_minor: sum(recent, (o) => posted(o, "fees_earned")),
    ad_fees_minor: sum(recent, (o) => posted(o, "promotion_fee")),
    promoted_orders: sold.filter((o) => o.promotion_rate !== null).length,
    cancelled: recent.length - sold.length,
    daily,
    top: [...byListing.values()].sort((a, b) => b.gross_minor - a.gross_minor).slice(0, 5),
  };
}
