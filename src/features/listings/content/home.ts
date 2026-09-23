import type { AssuranceArtName } from "@/features/listings/components/home/AssuranceArt";

export type Assurance = { art: AssuranceArtName; title: string; copy: string };
export type SellStep = { title: string; copy: string };

export const ASSURANCES: Assurance[] = [
  {
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
