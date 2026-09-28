import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/shared/components/Reveal";
<<<<<<< HEAD
=======
import { SELL_STEPS } from "@/features/listings/content/home";
import SellIllustration from "@/features/listings/components/home/SellIllustration";
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee

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
<<<<<<< HEAD
    <Reveal as="section" className="ws-sellband" aria-labelledby="home-sell">
      <div className="ws-sellband__intro">
        <span className="ws-sellband__eyebrow">Sell on WorldStore</span>
=======
    <section className="ws-sellband" aria-labelledby="home-sell">
      <Reveal className="ws-sellband__intro" index={0}>
        <span className="ws-sellband__eyebrow">Start selling</span>
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
        <h2 className="ws-sellband__title" id="home-sell">
          The shop you keep in your pocket
        </h2>
        <p className="ws-sellband__sub">
          Listing is free. Buyers pay into escrow, you ship, and the money lands
          in your wallet the day it is confirmed. Most sellers have their first
          listing live in under four minutes.
        </p>
<<<<<<< HEAD
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
=======
        <div className="ws-sellband__actions">
          <Link to="/vendor" className="ws-btn ws-btn--primary ws-sellband__cta">
            Open a store
            <ArrowRight size={16} aria-hidden />
          </Link>
          <span className="ws-sellband__note">
            Free · takes about two minutes
          </span>
        </div>
      </Reveal>

      <Reveal className="ws-sellband__art" index={1}>
        <SellIllustration />
      </Reveal>

      <ol className="ws-sellband__steps">
        {SELL_STEPS.map((step, i) => (
          <Reveal as="li" className="ws-sellband__step" index={2 + i} key={step.title}>
            <span className="ws-sellband__num ws-num" aria-hidden>
              {i + 1}
            </span>
            <div>
              <h3 className="ws-sellband__steptitle">{step.title}</h3>
              <p className="ws-sellband__stepcopy">{step.copy}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
  );
}
