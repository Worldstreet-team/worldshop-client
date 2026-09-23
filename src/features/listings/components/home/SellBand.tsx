import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/shared/components/Reveal";

/**
 * The pitch to sellers, exactly as the design sandbox has it: eyebrow, title,
 * one paragraph and two actions.
 *
 * The numbered "how it works" steps that used to sit beside this are gone. The
 * reference carries none, and the paragraph already says the whole flow, so the
 * steps restated it in a second voice and doubled the band's height.
 */
export default function SellBand() {
  return (
    <Reveal as="section" className="ws-sellband" aria-labelledby="home-sell">
      <div className="ws-sellband__intro">
        <span className="ws-sellband__eyebrow">Sell on WorldStore</span>
        <h2 className="ws-sellband__title" id="home-sell">
          The shop you keep in your pocket
        </h2>
        <p className="ws-sellband__sub">
          Listing is free. Buyers pay into escrow, you ship, and the money lands
          in your wallet the day it is confirmed. Most sellers have their first
          listing live in under four minutes.
        </p>
      </div>

      <div className="ws-sellband__actions">
        <Link to="/vendor/register" className="ws-btn ws-btn--primary ws-sellband__cta">
          Start selling
          <ArrowRight size={18} aria-hidden />
        </Link>
        <Link to="/terms" className="ws-btn ws-btn--secondary">
          How escrow works
        </Link>
      </div>
    </Reveal>
  );
}
