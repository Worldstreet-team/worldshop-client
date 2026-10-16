import { kobo, sumMinor, type Kobo } from "@ws/lib/money";

/*
 * R-003 total cost: "Total to {city}" = item + delivery + fees − discounts. One function
 * so the card, the listing page and the sticky bar always agree (R-020).
 */

export type TotalInput = {
  item_minor: Kobo;
  qty?: number;
  delivery_minor: Kobo;
  /** Buyer-paid fees. None today (K4), but the total must be able to carry them. */
  fees_minor?: Kobo;
  discount_minor?: Kobo;
};

export function buyerTotal({ item_minor, qty = 1, delivery_minor, fees_minor = kobo(0), discount_minor = kobo(0) }: TotalInput): Kobo {
  if (!Number.isInteger(qty) || qty < 1) throw new RangeError(`Quantity must be a whole number ≥ 1, got ${qty}`);
  const total = sumMinor(kobo(item_minor * qty), delivery_minor, fees_minor, kobo(-discount_minor));
  // A discount can't make the buyer owe less than nothing.
  return total < 0 ? kobo(0) : total;
}
