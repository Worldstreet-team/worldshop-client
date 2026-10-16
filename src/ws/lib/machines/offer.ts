/** §6.3: the lifecycle shared by buyer and seller surfaces. */
export type OfferStatus = "pending" | "countered" | "accepted" | "declined" | "expired" | "withdrawn" | "paid" | "lapsed";
export type OfferEvent = "accept" | "counter" | "decline" | "expire" | "withdraw" | "pay" | "lapse";
const transitions: Record<OfferStatus, Partial<Record<OfferEvent, OfferStatus>>> = {
  pending: { accept: "accepted", counter: "countered", decline: "declined", expire: "expired", withdraw: "withdrawn" },
  countered: { accept: "accepted", counter: "pending", decline: "declined", expire: "expired" },
  accepted: { pay: "paid", lapse: "lapsed" },
  declined: {}, expired: {}, withdrawn: {}, paid: {}, lapsed: {},
};
export function can(status: OfferStatus, event: OfferEvent) { return !!transitions[status]?.[event]; }
export function next(status: OfferStatus, event: OfferEvent): OfferStatus {
  const target = transitions[status]?.[event];
  if (!target) throw new Error(`Cannot ${event} an offer that is ${status}.`);
  return target;
}
