import { rules } from "@ws/config/marketplace-rules";
import { ESCROW, inspectionLine } from "./escrow";

/*
 * Home hero copy (L11.1). Escrow sentences come from
 * escrow.ts (L14 test 8); the numbers come from config, so the copy can't drift from
 * the rules it describes.
 */

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
};

/** At most `rules.home.maxHeroSlides` (R-015). The first is the one-line value prop (B1 alternates). */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: "welcome",
    eyebrow: "WorldStore Marketplace",
    title: "Buy and sell near you",
    body: ESCROW.held,
    cta: { label: "How escrow works", href: ESCROW.learnMoreHref },
  },
  {
    id: "inspect",
    eyebrow: "Phones and electronics",
    title: "Check it before the seller is paid",
    body: inspectionLine(rules.escrow.inspectionHours.phones, "Phones and electronics"),
    cta: { label: "Shop phones", href: "/search?cat=phones" },
  },
  {
    id: "deals",
    eyebrow: "Price drops",
    title: "Deals from sellers near you",
    body: `A price is only shown crossed out after ${rules.seller.wasPriceMinDays} days at the higher price.`,
    cta: { label: "See deals", href: "/search?sort=discount" },
  },
].slice(0, rules.home.maxHeroSlides);
