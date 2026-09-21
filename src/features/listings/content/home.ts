import type { LucideIcon } from "lucide-react";
import { MessageCircle, ShieldCheck, Tag } from "lucide-react";

export type Assurance = { Icon: LucideIcon; title: string; copy: string };
export type SellStep = { title: string; copy: string };

export const ASSURANCES: Assurance[] = [
  {
    Icon: MessageCircle,
    title: "Deal direct",
    copy: "Chat with the seller — no middlemen, no markups.",
  },
  {
    Icon: ShieldCheck,
    title: "Know your seller",
    copy: "Public ratings, reviews and verification on every store.",
  },
  {
    Icon: Tag,
    title: "Meet safely",
    copy: "Check the item in person before any money moves.",
  },
];

export const SELL_STEPS: SellStep[] = [
  {
    title: "Open your store",
    copy: "Pick a name, add your location and contact.",
  },
  {
    title: "Post your listing",
    copy: "Photos, price, condition — live in minutes.",
  },
  {
    title: "Chat and close",
    copy: "Buyers message you directly. Agree your own terms.",
  },
];
