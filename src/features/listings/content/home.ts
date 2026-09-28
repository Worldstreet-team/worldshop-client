<<<<<<< HEAD
import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Truck, Wallet } from "lucide-react";

export type Assurance = { Icon: LucideIcon; title: string; copy: string };
=======
import type { AssuranceArtName } from "@/features/listings/components/home/AssuranceArt";

export type Assurance = { art: AssuranceArtName; title: string; copy: string };
export type SellStep = { title: string; copy: string };
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee

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
<<<<<<< HEAD
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
=======
    art: "chat",
    title: "Deal direct",
    copy: "Chat with the seller — no middlemen, no markups.",
  },
  {
    art: "verified",
    title: "Know your seller",
    copy: "Public ratings, reviews and verification on every store.",
  },
  {
    art: "meet",
    title: "Meet safely",
    copy: "Check the item in person before any money moves.",
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
  },
];

