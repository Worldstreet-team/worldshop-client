import type { Condition } from "@ws/lib/data/types";

/** eBay's condition names in the DS's sentence case: one source for chips and filters. */
export const CONDITION_LABELS: Record<Condition, string> = {
  new: "Brand new",
  like_new: "Like new",
  refurbished: "Refurbished",
  used: "Pre-owned",
  for_parts: "For parts or not working",
};
