import Reveal from "@/shared/components/Reveal";
import { ASSURANCES } from "@/features/listings/content/home";
import AssuranceArt from "@/features/listings/components/home/AssuranceArt";
import TrustIllustration from "@/features/listings/components/home/TrustIllustration";

export default function Assurances() {
  return (
    <section className="ws-assure" aria-label="How WorldStore works">
      <Reveal className="ws-assure__art" index={0}>
        <TrustIllustration />
      </Reveal>

      <ul className="ws-assure__list">
        {ASSURANCES.map(({ art, title, copy }, i) => (
          <Reveal as="li" className="ws-assure__item" index={i + 1} key={title}>
            <AssuranceArt name={art} />
            <div>
              <h3 className="ws-assure__title">{title}</h3>
              <p className="ws-assure__copy">{copy}</p>
            </div>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
