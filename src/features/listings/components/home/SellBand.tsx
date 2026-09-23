import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "@/shared/components/Reveal";
import { SELL_STEPS } from "@/features/listings/content/home";
import SellIllustration from "@/features/listings/components/home/SellIllustration";

export default function SellBand() {
  return (
    <section className="ws-sellband" aria-labelledby="home-sell">
      <Reveal className="ws-sellband__intro" index={0}>
        <span className="ws-sellband__eyebrow">Start selling</span>
        <h2 className="ws-sellband__title" id="home-sell">
          Selling? List it in minutes.
        </h2>
        <p className="ws-sellband__sub">
          Open a store, post your first listing and talk to buyers directly.
          What you sell is yours — WorldStore takes no commission.
        </p>
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
  );
}
