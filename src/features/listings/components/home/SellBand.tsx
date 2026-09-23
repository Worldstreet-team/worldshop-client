import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/shared/components/Reveal";
import { SELL_STEPS } from "@/features/listings/content/home";

export default function SellBand() {
  return (
    <Reveal as="section" className="ws-sellband" aria-labelledby="home-sell">
      <div className="ws-sellband__intro">
        <span className="ws-sellband__eyebrow">Sell on WorldStore</span>
        <h2 className="ws-sellband__title" id="home-sell">
          The shop you keep in your pocket
        </h2>
        <p className="ws-sellband__sub">
          Listing is free. Buyers pay into escrow, you ship, and the money
          lands in your wallet the day it is confirmed. Most sellers have their
          first listing live in under four minutes.
        </p>
        <div className="ws-sellband__actions">
          <Link to="/vendor" className="ws-btn ws-btn--primary ws-sellband__cta">
            Start selling
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link to="/listings" className="ws-btn ws-btn--secondary">
            How escrow works
          </Link>
        </div>
      </div>

      <ol className="ws-sellband__steps">
        {SELL_STEPS.map((step, i) => (
          <li className="ws-sellband__step" key={step.title}>
            <span className="ws-sellband__num ws-num" aria-hidden>
              {i + 1}
            </span>
            <div>
              <h3 className="ws-sellband__steptitle">{step.title}</h3>
              <p className="ws-sellband__stepcopy">{step.copy}</p>
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
