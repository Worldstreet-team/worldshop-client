/** Flows §6.2. Order state is about the goods; escrow separately tracks the money. */
export const ORDER_STATUSES = ["payment_pending", "paid", "preparing", "dispatched", "in_transit", "out_for_delivery", "delivery_failed", "delivered", "disputed", "returned", "cancelled", "completed", "refunded"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];
export type OrderEvent = "pay" | "payment_fail" | "prepare" | "cancel" | "dispatch" | "transit" | "out_for_delivery" | "deliver" | "delivery_fail" | "reattempt" | "return" | "confirm" | "dispute" | "resolve_seller" | "resolve_buyer" | "refund";

const transitions: Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>> = {
  payment_pending: { pay: "paid", payment_fail: "cancelled" },
  paid: { prepare: "preparing", cancel: "cancelled" },
  preparing: { dispatch: "dispatched", cancel: "cancelled" },
  dispatched: { transit: "in_transit" },
  in_transit: { out_for_delivery: "out_for_delivery" },
  out_for_delivery: { deliver: "delivered", delivery_fail: "delivery_failed" },
  delivery_failed: { reattempt: "out_for_delivery", return: "returned" },
  delivered: { confirm: "completed", dispute: "disputed" },
  disputed: { resolve_seller: "completed", resolve_buyer: "refunded" },
  returned: { refund: "refunded" },
  cancelled: { refund: "refunded" },
  completed: {}, refunded: {},
};
export function nextOrder(status: OrderStatus, event: OrderEvent): OrderStatus {
  const target = transitions[status]?.[event];
  if (!target) throw new Error(`Cannot ${event} an order that is ${status}.`);
  return target;
}
export function canOrder(status: OrderStatus, event: OrderEvent) { return !!transitions[status]?.[event]; }
