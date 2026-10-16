import type { Listing } from "@ws/lib/data/types";

/* What a listing page offers for each status (flows R-021, R-032, R-121; state machine
   §6.1). Sold, ended and paused listings keep their page, for links people shared and for
   search, but swap the buying actions for "No longer available" and similar items.
   Reserved means another buyer's accepted offer holds it while they pay. Anything a buyer
   was never meant to see, or that moderation took down, is "gone": not found. */

export type Availability = "available" | "reserved" | "sold" | "ended" | "paused" | "gone";

export function availability(listing: Pick<Listing, "status" | "qty">): Availability {
  switch (listing.status) {
    case "live":
      return listing.qty > 0 ? "available" : "paused";
    case "reserved":
      return "reserved";
    case "sold":
      return "sold";
    case "ended":
      return "ended";
    case "paused":
      return "paused";
    default:
      // draft, in_review, rejected, removed
      return "gone";
  }
}

/** True when the page should still exist but nothing can be bought. */
export const isUnavailable = (a: Availability) => a === "sold" || a === "ended" || a === "paused";
