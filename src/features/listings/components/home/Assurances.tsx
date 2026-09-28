import Reveal from "@/shared/components/Reveal";
import { ASSURANCES } from "@/features/listings/content/home";
import AssuranceArt from "@/features/listings/components/home/AssuranceArt";
import TrustIllustration from "@/features/listings/components/home/TrustIllustration";

/**
 * The trust strip under the hero. One row of three on desktop, stacked below
 * 720px, divided by a 1px grid gap over a border-coloured backing rather than
 * per-cell borders, so the seams never double up.
 */
export default function Assurances() {
  return (
<<<<<<< HEAD
    <Reveal as="ul" className="ws-guarantees" aria-label="How WorldStore works">
      {ASSURANCES.map(({ Icon, title, copy }) => (
        <li className="ws-guarantees__item" key={title}>
          <span className="ws-guarantees__icon" aria-hidden>
            <Icon size={18} />
          </span>
          <div className="ws-guarantees__text">
            <p className="ws-guarantees__title">{title}</p>
            <p className="ws-guarantees__copy">{copy}</p>
          </div>
        </li>
      ))}
    </Reveal>
=======
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
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
  );
}
