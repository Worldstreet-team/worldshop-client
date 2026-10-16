/** Flows §6.4. */
export const DISPUTE_STATUSES = ["opened", "seller_response", "return_requested", "partial_offer", "return_in_transit", "return_received", "escalated", "auto_decided", "resolved_refund", "resolved_partial", "resolved_release"] as const;
export type DisputeStatus = typeof DISPUTE_STATUSES[number];
export type DisputeEvent = "notify_seller" | "accept_refund" | "offer_return" | "offer_partial" | "escalate" | "seller_timeout" | "accept_partial" | "reject_partial" | "ship_return" | "receive_return" | "approve_return" | "reject_return" | "ops_refund" | "ops_release" | "ops_partial" | "auto_refund";
const transitions: Record<DisputeStatus, Partial<Record<DisputeEvent, DisputeStatus>>> = {
  opened: { notify_seller: "seller_response" },
  seller_response: { accept_refund: "resolved_refund", offer_return: "return_requested", offer_partial: "partial_offer", escalate: "escalated", seller_timeout: "auto_decided" },
  partial_offer: { accept_partial: "resolved_partial", reject_partial: "escalated" },
  return_requested: { ship_return: "return_in_transit" },
  return_in_transit: { receive_return: "return_received" },
  return_received: { approve_return: "resolved_refund", reject_return: "escalated" },
  escalated: { ops_refund: "resolved_refund", ops_release: "resolved_release", ops_partial: "resolved_partial" },
  auto_decided: { auto_refund: "resolved_refund" },
  resolved_refund: {}, resolved_partial: {}, resolved_release: {},
};
export function nextDispute(status: DisputeStatus, event: DisputeEvent): DisputeStatus { const target = transitions[status]?.[event]; if (!target) throw new Error(`Cannot ${event} a dispute that is ${status}.`); return target; }
export function canDispute(status: DisputeStatus, event: DisputeEvent) { return !!transitions[status]?.[event]; }
