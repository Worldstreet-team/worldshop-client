import { rules } from "@ws/config/marketplace-rules";
import type { Category } from "@ws/lib/data/types";

/*
 * Every escrow claim comes from here (PLAN F9, flows L11.4, L14 test 8), so no surface
 * promises more than escrow does. WorldStore is peer to peer, with no cart or checkout
 * (owner's direction, 7 Oct): buyer and seller agree a deal in chat, the seller sends a
 * payment request, and the buyer pays it into escrow. Escrow covers those payments for
 * delivered goods and meet-ups; vehicles and property have no escrow (PLAN risk 7), and
 * off-platform payments aren't covered (R-005).
 */

/** True for every listing, so no blanket "every deal". */
const HELD = "Pay through WorldStore and your money is held until you get what you ordered.";

export const ESCROW = {
  /** Site description. */
  tagline: `Buy and sell near you. ${HELD}`,
  /** The home hero's first slide, under "Buy and sell near you". */
  held: HELD,
  /** Short claim next to a goods listing's price and delivery. */
  claim:
    "Agree a deal, then pay the seller's payment request through WorldStore: we hold your money until you confirm the item arrived as described, or the inspection window ends without a problem report.",
  /** For vehicles and property, which have no escrow. */
  noEscrow: "No escrow for this category. Inspect in person before you pay, and never pay a deposit to hold a viewing.",
  // Not "until you confirm": the inspection window can also end it (L11.4).
  strip: "We hold your payment while you check the item, then pay the seller.",
  /** A goods listing with no returns: what still protects the buyer (L7). */
  noReturns: "No returns, but escrow still covers an item that isn't as described.",
  /** Seller payout timing (L11.4: the one claim every surface uses). */
  payout: "Sellers are paid after delivery is confirmed, usually within 24 hours.",
  /** The listing page's protection block (spec §7 ProtectionPanel, eBay "Shop with confidence"). */
  protectionTitle: "Shop with confidence",
  /** L7: protection doesn't end when the money is released. */
  afterRelease: `Something wrong after that? Report it within ${rules.protection.anyIssueDays} days of delivery; fakes and safety problems, within ${rules.protection.counterfeitSafetyDays} days.`,
  /** R-005: only payment requests paid through WorldStore are covered. */
  offPlatform: "Paying the seller directly (transfer, cash before you see the item) isn't covered. Only payments made through a WorldStore payment request are covered.",
  /** Where the rules are explained. */
  learnMoreHref: "/help/escrow",
  orderHeld: "Your payment is held safely while the item is delivered and checked.",
  orderInTransit: "Your protected payment stays held until you receive and confirm the item.",
  orderFrozen: "The affected payment is under review and cannot be released while the case is open.",
  orderReleased: "The payment has been released to the seller. Buyer protection still applies for eligible problems.",
  orderRefunded: "The protected payment was refunded to you.",
  orderRefundFailed: "The refund could not reach the original payment method. The protected amount is still available for recovery.",
  orderRefunding: "Your refund was approved and is being sent to the selected destination.",
  orderPaymentPending: "We're confirming your payment. Your money isn't lost; we'll update this order when the provider responds.",
  orderClosed: "No protected payment is being held for this order.",
} as const;

/** R-212 + R-243: shown verbatim before a buyer confirms receipt. */
export function confirmReleaseCopy(total: string) {
  return `Release ${total} to the seller. You can still report a hidden defect within ${rules.protection.anyIssueDays} days, but you'll need to ask support for a refund from the seller.`;
}

/** The inspection window a category gets before the seller is paid (L4), as a sentence. */
export function inspectionLine(hours: number, what: string) {
  return `${what} paid for through WorldStore get ${hours} hours to check before the seller is paid.`;
}

export function escrowLine(category: Pick<Category, "kind">) {
  return category.kind === "goods" ? ESCROW.claim : ESCROW.noEscrow;
}
