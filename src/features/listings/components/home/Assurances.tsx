import Reveal from "@/shared/components/Reveal";
import { ASSURANCES } from "@/features/listings/content/home";

/**
 * The trust strip under the hero. One row of three on desktop, stacked below
 * 720px, divided by a 1px grid gap over a border-coloured backing rather than
 * per-cell borders, so the seams never double up.
 */
export default function Assurances() {
  return (
    <Reveal as="ul" className="ws-trust" aria-label="How WorldStore works">
      {ASSURANCES.map(({ Icon, title, copy }) => (
        <li className="ws-trust__item" key={title}>
          <span className="ws-trust__icon" aria-hidden>
            <Icon size={18} />
          </span>
          <div className="ws-trust__text">
            <p className="ws-trust__title">{title}</p>
            <p className="ws-trust__copy">{copy}</p>
          </div>
        </li>
      ))}
    </Reveal>
  );
}
