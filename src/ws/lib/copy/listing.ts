import { rules } from "@ws/config/marketplace-rules";
import type { Category, Condition, DeliveryMethod } from "@ws/lib/data/types";

/*
 * Listing page copy that isn't an escrow claim (those live in ./escrow): condition
 * definitions, delivery method names, returns, payment methods, safety tips and the
 * report reasons. Plain sentences, sentence case, numbers from config.
 */

/** eBay-style definitions for the condition popover (spec §7 ConditionInfo). */
export const CONDITION_DEFINITIONS: Record<Condition, string> = {
  new: "Unused and unopened, in the original packaging, with every accessory it came with.",
  like_new: "Opened but barely used. No visible marks, works perfectly, may not have the original box.",
  refurbished: "Repaired or restored to full working order by the seller or a technician. May show light marks.",
  used: "Used before and works as it should. Expect some signs of wear; the description and photos show them.",
  for_parts: "Doesn't fully work. Sold for repair or spare parts, as described.",
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  rider: "Rider delivery",
  courier: "Courier delivery",
  pickup_station: "Pickup station",
  meet_up: "Meet-up / local pickup",
};

/** Returns policy as the buyer reads it (flows B3 step 3, S2 step 6). */
export function returnsCopy(days: number | null) {
  if (days === null) {
    return {
      title: "No returns",
      lines: ["The seller doesn't take returns for a change of mind.", "If the item isn't as described, report it: that's covered whatever the return policy."],
    };
  }
  return {
    title: `${days}-day returns`,
    lines: [
      `Return it within ${days} days of delivery.`,
      "Faulty or not as described: the seller pays return delivery.",
      "Change of mind: you pay return delivery, and the item must come back unused, with everything it came with.",
    ],
  };
}

/** flows B9: ways to pay a seller's payment request (P2P: no checkout). Pay on delivery stays behind its flag (K5). */
export const PAYMENT_METHODS = [
  { id: "card", label: "Card", detail: "Verve, Mastercard, Visa" },
  { id: "transfer", label: "Bank transfer", detail: "To a one-time account number" },
  { id: "ussd", label: "USSD", detail: "From any phone, no data needed" },
  { id: "wallet", label: "WorldStore wallet", detail: "Your balance" },
] as const;

/** flows B3 step 9 and the vehicle/property alternate: what to do, in order. */
export function safetyTips(kind: Category["kind"]): readonly string[] {
  const pay = "Pay only the seller's payment request, through WorldStore. Never pay a deposit to hold an item or a viewing.";
  if (kind === "goods") {
    return [
      pay,
      "For meet-ups, choose a busy public place in daylight, and bring someone if you can.",
      "Check the item before you confirm delivery: confirming pays the seller.",
      "Keep the chat on WorldStore, so there's a record if something goes wrong.",
    ];
  }
  return [
    "There's no escrow here: don't pay anything until you've inspected in person.",
    kind === "vehicle"
      ? "Inspect in daylight with a mechanic, and check the papers match the vehicle (chassis number, customs, registration)."
      : "View in person, meet the owner or their agent, and check the documents before you sign or pay.",
    "Meet in a busy public place, and bring someone with you.",
    "Keep the chat on WorldStore, so there's a record if something goes wrong.",
  ];
}

/** ReportListingModal reasons (moderation queue codes, flows §632 and EC-034). */
export const REPORT_REASONS = [
  { id: "prohibited", label: "Prohibited or illegal item" },
  { id: "counterfeit", label: "Fake or counterfeit" },
  { id: "scam", label: "Looks like a scam", hint: "Asks for payment outside WorldStore, a deposit, or personal details" },
  { id: "misleading", label: "Wrong price, photos or description" },
  { id: "wrong_category", label: "Wrong category" },
  { id: "offensive", label: "Offensive content" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export const REPORT_THANKS = `Thanks. Our team reviews reports within ${rules.moderation.reportReviewHours} hours. We don't tell the seller who reported.`;

/** Listing pages that can't be bought (R-021, R-032, R-121). */
export const UNAVAILABLE = {
  sold: { title: "This item has sold", body: "The seller has none left. Similar items are below." },
  ended: { title: "This listing has ended", body: "The seller ended it before it sold. Similar items are below." },
  paused: { title: "Out of stock right now", body: "The seller has paused this listing until they restock. Save it to find it again." },
  reserved: {
    title: "Offer pending",
    body: "The seller accepted another buyer's offer and they're paying now. If that sale doesn't complete, it goes back on sale.",
  },
} as const;
