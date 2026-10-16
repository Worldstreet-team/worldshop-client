import { rules } from "@ws/config/marketplace-rules";
import { assertLedgerInvariant, balances, captureToEscrow, createLedger, LEDGER_ACCOUNTS, post, releaseToSeller, reversePosting, type Ledger } from "@ws/lib/ledger";
import { DISPUTE_STATUSES, nextDispute, type DisputeStatus } from "@ws/lib/machines/dispute";
import { ESCROW_STATUSES, nextEscrow, type EscrowStatus } from "@ws/lib/machines/escrow";
import { nextOrder, ORDER_STATUSES, type OrderStatus } from "@ws/lib/machines/order";

export type OrderEvent = { status: OrderStatus; at: number; label: string };
export type Review = { overall: number; description: number; delivery: number; communication: number; packaging: number; body: string; created_at: number };
export const DISPUTE_REASONS = ["wrong_item", "damaged", "not_as_described", "missing_parts", "other"] as const;
export type DisputeReason = typeof DISPUTE_REASONS[number];
export const needsMediaEvidence = (reason: DisputeReason) => reason === "damaged" || reason === "not_as_described";
export type OpsOutcome = "refund" | "release" | "partial";
/** Ops ruling (L8 step 5): the written rationale is shown to both parties. */
export type Decision = { outcome: OpsOutcome; refund_minor: number; rationale: string; staff: string; at: number };
export type Dispute = { id: string; reason: DisputeReason; detail: string; remedy: "refund"; package_opened: boolean; media_ready: boolean; status: DisputeStatus; opened_at: number; seller_due_at: number; refund_destination?: "original" | "wallet"; decision?: Decision; info_requests?: { at: number; note: string; staff: string }[] };
export type Order = {
  id: string; listing_id: string; seller_id: string; seller_name: string; title: string; photo: string;
  unit_minor: number; qty: number; delivery_minor: number; total_minor: number;
  status: OrderStatus; escrow_status: EscrowStatus; created_at: number; events: OrderEvent[];
  courier: string; relay_phone: string; tracking_code: string; delivery_pin: string; eta: string;
  delivery_proof: boolean; delivered_at: number | null; inspection_deadline: number | null; inspection_extended: boolean;
  ops_hold: boolean; chargeback_pending: boolean; dispute: Dispute | null; review: Review | null; ledger: Ledger;
};
export type OrdersState = { orders: Order[]; receipts: Record<string, string> };
export type OrderCommand =
  | { type: "confirm"; id: string; order_id: string }
  | { type: "auto_release"; id: string; order_id: string }
  | { type: "extend"; id: string; order_id: string }
  | { type: "dispute"; id: string; order_id: string; reason: DisputeReason; detail: string; remedy: "refund"; package_opened: boolean; media_ready: boolean }
  | { type: "refund"; id: string; order_id: string; outcome: "success" | "failed" }
  | { type: "wallet_credit"; id: string; order_id: string }
  | { type: "review"; id: string; order_id: string; review: Omit<Review, "created_at"> }
  | { type: "ops_decide"; id: string; order_id: string; outcome: OpsOutcome | "info"; refund_minor?: number; rationale: string; staff: string }
  | { type: "reverse"; id: string; order_id: string; posting_id: string; reason: string };

const HOUR = 3_600_000;
const at = (value: string) => Date.parse(value);
function heldLedger(id: string, total: number, now: number) { return captureToEscrow(createLedger(id, total), `${id}:capture`, now); }
export function initialOrdersState(): OrdersState {
  const deliveredAt = at("2026-10-07T18:00:00Z");
  const deliveredTotal = 452_000_00;
  const activeTotal = 128_500_00;
  const completedTotal = 84_500_00;
  let completedLedger = heldLedger("WS-84017", completedTotal, at("2026-10-02T09:00:00Z"));
  completedLedger = releaseToSeller(completedLedger, 82_000_00, 2_500_00, "WS-84017:release", at("2026-10-05T16:00:00Z"));
  return { receipts: {}, orders: [
    {
      id: "WS-84291", listing_id: "204501", seller_id: "seller-1", seller_name: "Gadget Hub Ikeja", title: "iPhone 14 Pro 256GB Deep Purple", photo: "/mock/img/phones-1.svg",
      unit_minor: 450_000_00, qty: 1, delivery_minor: 2_000_00, total_minor: deliveredTotal,
      status: "delivered", escrow_status: "held", created_at: at("2026-10-06T10:00:00Z"),
      events: [{ status: "paid", at: at("2026-10-06T10:00:00Z"), label: "Payment held" }, { status: "preparing", at: at("2026-10-06T10:20:00Z"), label: "Seller preparing" }, { status: "dispatched", at: at("2026-10-06T15:00:00Z"), label: "Dispatched" }, { status: "in_transit", at: at("2026-10-07T08:00:00Z"), label: "In transit" }, { status: "out_for_delivery", at: at("2026-10-07T14:00:00Z"), label: "Out for delivery" }, { status: "delivered", at: deliveredAt, label: "Delivered with PIN" }],
      courier: "SwiftDrop", relay_phone: "+234 700 000 0142", tracking_code: "SD-204501-NG", delivery_pin: "8142", eta: "Delivered 7 Oct", delivery_proof: true, delivered_at: deliveredAt,
      inspection_deadline: deliveredAt + rules.escrow.inspectionHours.phones! * HOUR, inspection_extended: false, ops_hold: false, chargeback_pending: false, dispute: null, review: null, ledger: heldLedger("WS-84291", deliveredTotal, at("2026-10-06T10:00:00Z")),
    },
    {
      id: "WS-84276", listing_id: "204507", seller_id: "seller-2", seller_name: "HomeWorks Abuja", title: "Handcrafted oak coffee table", photo: "/mock/img/furniture-1.svg",
      unit_minor: 125_000_00, qty: 1, delivery_minor: 3_500_00, total_minor: activeTotal,
      status: "in_transit", escrow_status: "held", created_at: at("2026-10-05T11:00:00Z"), events: [{ status: "paid", at: at("2026-10-05T11:00:00Z"), label: "Payment held" }, { status: "preparing", at: at("2026-10-05T13:00:00Z"), label: "Seller preparing" }, { status: "dispatched", at: at("2026-10-06T09:00:00Z"), label: "Dispatched" }, { status: "in_transit", at: at("2026-10-07T07:30:00Z"), label: "In transit" }],
      courier: "GIG Logistics", relay_phone: "+234 700 000 2208", tracking_code: "GIG-84276", delivery_pin: "2208", eta: "Arrives 9–10 Oct", delivery_proof: false, delivered_at: null, inspection_deadline: null, inspection_extended: false, ops_hold: false, chargeback_pending: false, dispute: null, review: null, ledger: heldLedger("WS-84276", activeTotal, at("2026-10-05T11:00:00Z")),
    },
    {
      id: "WS-84017", listing_id: "204509", seller_id: "seller-3", seller_name: "Style Archive", title: "Vintage leather travel bag", photo: "/mock/img/fashion-1.svg",
      unit_minor: 82_000_00, qty: 1, delivery_minor: 2_500_00, total_minor: completedTotal,
      status: "completed", escrow_status: "seller_pending", created_at: at("2026-10-01T08:00:00Z"), events: [{ status: "paid", at: at("2026-10-01T08:00:00Z"), label: "Payment held" }, { status: "dispatched", at: at("2026-10-02T09:00:00Z"), label: "Dispatched" }, { status: "delivered", at: at("2026-10-05T14:00:00Z"), label: "Delivered" }, { status: "completed", at: at("2026-10-05T16:00:00Z"), label: "Receipt confirmed" }],
      courier: "Kwik", relay_phone: "+234 700 000 9911", tracking_code: "KW-84017", delivery_pin: "9911", eta: "Delivered 5 Oct", delivery_proof: true, delivered_at: at("2026-10-05T14:00:00Z"), inspection_deadline: at("2026-10-07T14:00:00Z"), inspection_extended: false, ops_hold: false, chargeback_pending: false, dispute: null, review: null, ledger: completedLedger,
    },
  ] };
}
export const initialState = initialOrdersState();
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function canAutoRelease(order: Order) { return order.status === "delivered" && order.delivery_proof && !order.dispute && !order.ops_hold && !order.chargeback_pending; }
export function remainingFromServer(deadline: number, serverNow: number, clientAtSync: number, clientNow: number) { return Math.max(0, deadline - (clientNow + (serverNow - clientAtSync))); }
export function executeOrder(previous: OrdersState, command: OrderCommand, now: number): OrdersState {
  const signature = JSON.stringify(command);
  if (previous.receipts[command.id]) { assert(previous.receipts[command.id] === signature, "This command key was already used."); return previous; }
  const state = structuredClone(previous);
  const order = state.orders.find((candidate) => candidate.id === command.order_id);
  assert(order, "Order not found.");
  if (command.type === "confirm" || command.type === "auto_release") {
    assert(canAutoRelease(order), "Delivery proof and a clear order are required before release.");
    if (command.type === "auto_release") assert(order.inspection_deadline !== null && now >= order.inspection_deadline, "The inspection window is still open.");
    order.status = nextOrder(order.status, "confirm");
    order.escrow_status = nextEscrow(nextEscrow(order.escrow_status, "eligible"), "release");
    order.ledger = releaseToSeller(order.ledger, order.unit_minor * order.qty, order.delivery_minor, `${command.id}:release`, now);
    order.events.push({ status: order.status, at: now, label: command.type === "confirm" ? "Receipt confirmed · funds released" : "Inspection ended · funds released" });
  } else if (command.type === "extend") {
    assert(order.status === "delivered" && order.inspection_deadline !== null && now < order.inspection_deadline && !order.inspection_extended, "This inspection window cannot be extended.");
    order.inspection_deadline += rules.escrow.extensionHours * HOUR; order.inspection_extended = true;
  } else if (command.type === "dispute") {
    assert(order.status === "delivered" && !order.dispute, "A problem cannot be opened for this order now.");
    assert(DISPUTE_REASONS.includes(command.reason) && command.detail.trim().length >= 10 && command.remedy === "refund", "Complete the problem details.");
    assert(typeof command.package_opened === "boolean" && (!needsMediaEvidence(command.reason) || command.media_ready), "Required evidence is missing.");
    order.status = nextOrder(order.status, "dispute"); order.escrow_status = nextEscrow(order.escrow_status, "freeze");
    const held = balances(order.ledger).escrow_held;
    order.ledger = post(order.ledger, { idempotency_key: `${command.id}:freeze`, debit_account: "escrow_held", credit_account: "escrow_frozen", amount_minor: held, reason_code: "dispute_opened", actor: "user", created_at: now });
    order.dispute = { id: command.id, reason: command.reason, detail: command.detail.trim(), remedy: command.remedy, package_opened: command.package_opened, media_ready: command.media_ready, status: nextDispute("opened", "notify_seller"), opened_at: now, seller_due_at: now + rules.disputes.sellerResponseHours * HOUR };
    order.events.push({ status: order.status, at: now, label: "Problem reported · escrow frozen" });
  } else if (command.type === "refund") {
    assert(order.dispute?.status === "seller_response" && order.escrow_status === "frozen", "This refund is not ready.");
    order.dispute.status = nextDispute(order.dispute.status, "accept_refund"); order.escrow_status = nextEscrow(order.escrow_status, "buyer_ruling");
    const frozen = balances(order.ledger).escrow_frozen;
    order.ledger = post(order.ledger, { idempotency_key: `${command.id}:approved`, debit_account: "escrow_frozen", credit_account: "refunds_payable", amount_minor: frozen, reason_code: "refund_approved", actor: "system", created_at: now });
    if (command.outcome === "failed") order.escrow_status = nextEscrow(order.escrow_status, "refund_fail");
    else {
      order.ledger = post(order.ledger, { idempotency_key: `${command.id}:paid`, debit_account: "refunds_payable", credit_account: "buyer_refunded", amount_minor: frozen, reason_code: "refund_paid", actor: "system", created_at: now });
      order.escrow_status = nextEscrow(order.escrow_status, "refund_confirm"); order.status = nextOrder(order.status, "resolve_buyer");
    }
    order.events.push({ status: order.status, at: now, label: command.outcome === "failed" ? "Refund could not be delivered" : "Refund sent to buyer" });
  } else if (command.type === "wallet_credit") {
    assert(order.escrow_status === "refund_failed", "No failed refund needs recovery.");
    const payable = balances(order.ledger).refunds_payable;
    order.ledger = post(order.ledger, { idempotency_key: `${command.id}:wallet`, debit_account: "refunds_payable", credit_account: "buyer_refunded", amount_minor: payable, reason_code: "wallet_credit", actor: "system", created_at: now });
    order.escrow_status = nextEscrow(order.escrow_status, "wallet_credit"); order.status = nextOrder(order.status, "resolve_buyer");
    order.events.push({ status: order.status, at: now, label: "Refund recovered to WorldStore balance" });
  } else if (command.type === "ops_decide") {
    const dispute = order.dispute;
    assert(dispute && order.escrow_status === "frozen" && ["seller_response", "escalated"].includes(dispute.status), "This case has no frozen escrow to decide.");
    const rationale = command.rationale.trim();
    assert(rationale.length >= 20, "Write a rationale of at least 20 characters. Both parties will read it.");
    if (dispute.status === "seller_response") dispute.status = nextDispute(dispute.status, "escalate");
    if (command.outcome === "info") {
      dispute.info_requests = [...(dispute.info_requests ?? []), { at: now, note: rationale, staff: command.staff }];
      order.events.push({ status: order.status, at: now, label: "WorldStore asked for more information" });
    } else {
      const item = order.unit_minor * order.qty;
      const refund = command.outcome === "refund" ? order.total_minor : command.outcome === "release" ? 0 : command.refund_minor ?? 0;
      assert(Number.isSafeInteger(refund) && (command.outcome !== "partial" || (refund > 0 && refund < order.total_minor)), "A partial refund must be more than ₦0 and less than the order total.");
      if (refund) {
        order.ledger = post(order.ledger, { idempotency_key: `${command.id}:refund`, debit_account: "escrow_frozen", credit_account: "refunds_payable", amount_minor: refund, reason_code: "ruling_refund", actor: "admin", created_at: now });
        order.ledger = post(order.ledger, { idempotency_key: `${command.id}:refund_paid`, debit_account: "refunds_payable", credit_account: "buyer_refunded", amount_minor: refund, reason_code: "refund_paid", actor: "system", created_at: now });
      }
      const rest = order.total_minor - refund;
      if (rest) {
        order.ledger = post(order.ledger, { idempotency_key: `${command.id}:unfreeze`, debit_account: "escrow_frozen", credit_account: "escrow_held", amount_minor: rest, reason_code: "ruling_release", actor: "admin", created_at: now });
        const itemPart = Math.max(0, item - refund);
        order.ledger = releaseToSeller(order.ledger, itemPart, rest - itemPart, `${command.id}:release`, now);
      }
      if (command.outcome === "refund") {
        dispute.status = nextDispute(dispute.status, "ops_refund");
        order.escrow_status = nextEscrow(nextEscrow(order.escrow_status, "buyer_ruling"), "refund_confirm");
        order.status = nextOrder(order.status, "resolve_buyer");
      } else {
        dispute.status = nextDispute(dispute.status, command.outcome === "release" ? "ops_release" : "ops_partial");
        order.escrow_status = command.outcome === "release" ? nextEscrow(order.escrow_status, "seller_ruling") : nextEscrow(nextEscrow(order.escrow_status, "partial_ruling"), "seller_ruling");
        order.status = nextOrder(order.status, "resolve_seller");
      }
      dispute.decision = { outcome: command.outcome, refund_minor: refund, rationale, staff: command.staff, at: now };
      order.events.push({ status: order.status, at: now, label: command.outcome === "refund" ? "Case decided · full refund" : command.outcome === "release" ? "Case decided · paid to seller" : "Case decided · partial refund" });
    }
  } else if (command.type === "reverse") {
    order.ledger = reversePosting(order.ledger, command.posting_id, now, command.reason);
  } else {
    assert(order.status === "completed" && !order.review, "Only an unreviewed completed order can be reviewed.");
    for (const score of [command.review.overall, command.review.description, command.review.delivery, command.review.communication, command.review.packaging]) assert(Number.isInteger(score) && score >= 1 && score <= 5, "Choose every rating from 1 to 5.");
    order.review = { ...command.review, body: command.review.body.trim(), created_at: now };
  }
  state.receipts[command.id] = signature;
  return state;
}
export function reconcileExpiredOrders(previous: OrdersState, now: number) {
  return previous.orders.reduce((state, order) => {
    if (!order.inspection_deadline || now < order.inspection_deadline || !canAutoRelease(order)) return state;
    return executeOrder(state, { type: "auto_release", id: `${order.id}:auto-release:${order.inspection_deadline}`, order_id: order.id }, now);
  }, previous);
}
const isText = (value: unknown) => typeof value === "string" && value.length > 0;
const isTime = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const isScore = (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
function validPersistedOrder(order: Order) {
  const money = [order.unit_minor, order.delivery_minor, order.total_minor];
  const text = [order.id, order.listing_id, order.seller_id, order.seller_name, order.title, order.photo, order.courier, order.relay_phone, order.tracking_code, order.delivery_pin, order.eta];
  const ledger = order.ledger;
  const ledgerReceipts = ledger?.receipts && typeof ledger.receipts === "object" ? Object.values(ledger.receipts) : [];
  const validLedger = ledger?.order_id === order.id && ledger.captured_minor === order.total_minor && Array.isArray(ledger.postings) && ledgerReceipts.every((value) => typeof value === "string") && ledger.postings.every((row) => {
    const input = { idempotency_key: row.idempotency_key, debit_account: row.debit_account, credit_account: row.credit_account, amount_minor: row.amount_minor, reason_code: row.reason_code, actor: row.actor, created_at: row.created_at };
    return isText(row.id) && row.order_id === order.id && isText(row.idempotency_key) && LEDGER_ACCOUNTS.includes(row.debit_account) && LEDGER_ACCOUNTS.includes(row.credit_account) && row.debit_account !== row.credit_account && Number.isSafeInteger(row.amount_minor) && row.amount_minor > 0 && isText(row.reason_code) && ["system", "user", "admin"].includes(row.actor) && isTime(row.created_at) && ledger.receipts[row.idempotency_key] === JSON.stringify(input);
  });
  const validDispute = order.dispute === null || (isText(order.dispute?.id) && DISPUTE_REASONS.includes(order.dispute.reason) && isText(order.dispute.detail) && order.dispute.remedy === "refund" && typeof order.dispute.package_opened === "boolean" && typeof order.dispute.media_ready === "boolean" && DISPUTE_STATUSES.includes(order.dispute.status) && isTime(order.dispute.opened_at) && isTime(order.dispute.seller_due_at) && (!order.dispute.refund_destination || ["original", "wallet"].includes(order.dispute.refund_destination))
    && (order.dispute.decision === undefined || (["refund", "release", "partial"].includes(order.dispute.decision.outcome) && Number.isSafeInteger(order.dispute.decision.refund_minor) && order.dispute.decision.refund_minor >= 0 && isText(order.dispute.decision.rationale) && isText(order.dispute.decision.staff) && isTime(order.dispute.decision.at)))
    && (order.dispute.info_requests === undefined || (Array.isArray(order.dispute.info_requests) && order.dispute.info_requests.every((r) => isTime(r.at) && isText(r.note) && isText(r.staff)))));
  const validReview = order.review === null || ([order.review.overall, order.review.description, order.review.delivery, order.review.communication, order.review.packaging].every(isScore) && typeof order.review.body === "string" && isTime(order.review.created_at));
  return text.every(isText) && ORDER_STATUSES.includes(order.status) && ESCROW_STATUSES.includes(order.escrow_status) && money.every((value) => Number.isSafeInteger(value) && value >= 0) && Number.isSafeInteger(order.qty) && order.qty > 0 && order.total_minor === order.unit_minor * order.qty + order.delivery_minor && isTime(order.created_at) && Array.isArray(order.events) && order.events.every((event) => ORDER_STATUSES.includes(event.status) && isTime(event.at) && isText(event.label)) && typeof order.delivery_proof === "boolean" && (order.delivered_at === null || isTime(order.delivered_at)) && (order.inspection_deadline === null || isTime(order.inspection_deadline)) && typeof order.inspection_extended === "boolean" && typeof order.ops_hold === "boolean" && typeof order.chargeback_pending === "boolean" && validLedger && validDispute && validReview && assertLedgerInvariant(ledger);
}
export function parseOrdersState(raw: unknown): OrdersState {
  try {
    const state = raw as OrdersState;
    assert(state && Array.isArray(state.orders) && state.orders.length > 0 && state.receipts && typeof state.receipts === "object" && Object.values(state.receipts).every((value) => typeof value === "string"), "state");
    assert(state.orders.every(validPersistedOrder), "orders");
    return state;
  } catch { return initialOrdersState(); }
}
