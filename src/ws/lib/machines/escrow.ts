/** Part L3. Names remain explicit because buyer/seller copy maps from this state. */
export const ESCROW_STATUSES = ["awaiting_payment", "held", "release_eligible", "seller_pending", "seller_available", "frozen", "partial_split", "cancelled_refunding", "refunding", "refund_failed", "refunded", "withdrawn", "closed"] as const;
export type EscrowStatus = typeof ESCROW_STATUSES[number];
export type EscrowEvent = "capture" | "payment_fail" | "cancel" | "eligible" | "freeze" | "release" | "payout_available" | "withdraw" | "seller_ruling" | "partial_ruling" | "buyer_ruling" | "refund_confirm" | "refund_fail" | "refund_retry" | "wallet_credit";
const transitions: Record<EscrowStatus, Partial<Record<EscrowEvent, EscrowStatus>>> = {
  awaiting_payment: { capture: "held", payment_fail: "closed" },
  held: { cancel: "cancelled_refunding", eligible: "release_eligible", freeze: "frozen" },
  release_eligible: { freeze: "frozen", release: "seller_pending" },
  seller_pending: { payout_available: "seller_available", freeze: "frozen" },
  seller_available: { withdraw: "withdrawn" },
  frozen: { seller_ruling: "seller_pending", partial_ruling: "partial_split", buyer_ruling: "refunding" },
  partial_split: { buyer_ruling: "refunding", seller_ruling: "seller_pending" },
  cancelled_refunding: { refund_confirm: "refunded", refund_fail: "refund_failed" },
  refunding: { refund_confirm: "refunded", refund_fail: "refund_failed" },
  refund_failed: { refund_retry: "refunding", wallet_credit: "refunded" },
  refunded: {}, withdrawn: {}, closed: {},
};
export function nextEscrow(status: EscrowStatus, event: EscrowEvent): EscrowStatus {
  const target = transitions[status]?.[event];
  if (!target) throw new Error(`Cannot ${event} escrow that is ${status}.`);
  return target;
}
export function canEscrow(status: EscrowStatus, event: EscrowEvent) { return !!transitions[status]?.[event]; }
