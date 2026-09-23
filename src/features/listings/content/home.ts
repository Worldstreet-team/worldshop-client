import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Truck, Wallet } from "lucide-react";

export type Assurance = { Icon: LucideIcon; title: string; copy: string };

/**
 * The trust strip under the hero, copied from the design sandbox.
 *
 * Each line names a concrete mechanic rather than a virtue: what holds the
 * money, what you can see while it ships, when the seller is paid. "Deal
 * direct" and "Meet safely", which these replace, described the old
 * meet-in-person marketplace and say nothing once escrow exists.
 */
export const ASSURANCES: Assurance[] = [
  {
    Icon: ShieldCheck,
    title: "Escrow on every deal",
    copy: "We hold the money until you confirm the item arrived as described.",
  },
  {
    Icon: Truck,
    title: "Delivery you can follow",
    copy: "Dispatch, in transit and delivered, with the rider's number on the order.",
  },
  {
    Icon: Wallet,
    title: "Paid into your wallet",
    copy: "Sellers are settled the day a buyer confirms, straight to the WorldStreet balance.",
  },
];

