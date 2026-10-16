import { rules } from "@ws/config/marketplace-rules";
import type { DeliveryOption } from "@ws/lib/data/types";
import type { Kobo } from "@ws/lib/money";

/*
 * What the card's delivery line says, eBay style: "Free delivery in 2–4 days",
 * "+₦2,500 delivery in 1–2 days", "+₦3,000 pickup station", "Pickup only", or that the
 * seller doesn't deliver to the buyer's city, plus eBay's "Free local pickup" when a
 * meet-up is possible. Door delivery leads: a pickup station is cheaper but isn't
 * delivery, and a meet-up is never "free delivery".
 */

type Base = { pickup: boolean };
export type DeliverySummary =
  | (Base & { kind: "free"; option: DeliveryOption })
  | (Base & { kind: "paid"; option: DeliveryOption; fee_minor: Kobo })
  | (Base & { kind: "station"; option: DeliveryOption; fee_minor: Kobo })
  | { kind: "pickup" }
  | { kind: "none" }
  /**
   * The seller set no delivery options. The live API has nowhere to keep them yet, so
   * this is every listing there: delivery is agreed in the conversation, which is not
   * the same as "doesn't deliver".
   */
  | { kind: "arranged" };

const cheapest = (options: DeliveryOption[]) => options.reduce((best, o) => (o.fee_minor < best.fee_minor ? o : best));

/**
 * `sameCity` is whether the buyer's anchor is in the listing's city. Undefined (no
 * anchor yet) assumes it is, so the line shows the seller's cheapest option.
 */
export function summariseDelivery(options: readonly DeliveryOption[], sameCity?: boolean): DeliverySummary {
  if (options.length === 0) return { kind: "arranged" };
  const reachable = options.filter((o) => o.coverage === "nationwide" || sameCity !== false);
  const door = reachable.filter((o) => o.method === "rider" || o.method === "courier");
  const stations = reachable.filter((o) => o.method === "pickup_station");
  const pickup = sameCity !== false && options.some((o) => o.method === "meet_up");

  if (door.length > 0) {
    const best = cheapest(door);
    return best.fee_minor === 0 ? { kind: "free", option: best, pickup } : { kind: "paid", option: best, fee_minor: best.fee_minor, pickup };
  }
  if (stations.length > 0) {
    const best = cheapest(stations);
    return { kind: "station", option: best, fee_minor: best.fee_minor, pickup };
  }
  // Only meet-ups: the buyer travels, so it's pickup even from another city.
  if (options.some((o) => o.method === "meet_up")) return { kind: "pickup" };
  return { kind: "none" };
}

/** The delivery cost that goes into "Total to {city}", or null when there is no delivery. */
export function deliveryFee(summary: DeliverySummary): Kobo | null {
  if (summary.kind === "free") return summary.option.fee_minor;
  if (summary.kind === "paid" || summary.kind === "station") return summary.fee_minor;
  return null;
}

/** Business days from purchase to arrival: handling plus transit (eBay shows this on tiles). */
export function deliveryEstimate(option: DeliveryOption): readonly [number, number] {
  return [option.eta_days[0] + rules.delivery.typicalHandlingDays, option.eta_days[1] + rules.orders.handlingDays];
}

/* Nigeria is UTC+1 all year (no daylight saving), so Lagos dates are UTC dates an hour on. */
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Lagos calendar day `n` business days (Mon–Fri) after `from`, as midnight UTC of that date. */
export function addBusinessDays(from: number, n: number): Date {
  const d = new Date(from + LAGOS_OFFSET_MS);
  let day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  for (let left = n; left > 0; ) {
    day += DAY_MS;
    const wd = new Date(day).getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return new Date(day);
}

/** The arrival window for an order placed at `now`: handling plus transit, in business days. */
export function arrivalRange(option: DeliveryOption, now: number): readonly [Date, Date] {
  const [min, max] = deliveryEstimate(option);
  return [addBusinessDays(now, min), addBusinessDays(now, max)];
}

// Built by hand: ICU builds disagree on the comma ("Tue, 13 Oct" vs "Tue 13 Oct").
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d: Date) => `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
const dayMonth = (d: Date) => `${day(d)} ${MONTHS[d.getUTCMonth()]}`;

/** "Thu 8 – Sat 10 Oct", or "Thu 30 Oct – Mon 3 Nov" across a month (flows B3 step 3). */
export function formatDateRange([a, b]: readonly [Date, Date]) {
  if (a.getTime() === b.getTime()) return dayMonth(a);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return `${sameMonth ? day(a) : dayMonth(a)} – ${dayMonth(b)}`;
}
