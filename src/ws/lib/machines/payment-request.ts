/** Phase 5: a payment request can be retried after provider failure, while paid and
 * expired requests are terminal. The provider result is an event, never client state. */
export type PaymentRequestStatus = "unpaid" | "processing" | "declined" | "timed_out" | "paid" | "expired";
export type PaymentRequestEvent = "start" | "succeed" | "decline" | "timeout" | "retry" | "expire";

const transitions: Record<PaymentRequestStatus, Partial<Record<PaymentRequestEvent, PaymentRequestStatus>>> = {
  unpaid: { start: "processing", expire: "expired" },
  processing: { succeed: "paid", decline: "declined", timeout: "timed_out", expire: "expired" },
  declined: { retry: "processing", expire: "expired" },
  timed_out: { retry: "processing", expire: "expired" },
  paid: {},
  expired: {},
};

export function canPayRequest(status: PaymentRequestStatus, event: PaymentRequestEvent) {
  return !!transitions[status]?.[event];
}

export function nextPaymentRequest(status: PaymentRequestStatus, event: PaymentRequestEvent): PaymentRequestStatus {
  const target = transitions[status]?.[event];
  if (!target) throw new Error(`Cannot ${event} a payment request that is ${status}.`);
  return target;
}
