import Reveal from "@/shared/components/Reveal";
import { ASSURANCES } from "@/features/listings/content/home";

/**
 * The trust strip under the hero. One row of three on desktop, stacked below
 * 720px, divided by a 1px grid gap over a border-coloured backing rather than
 * per-cell borders, so the seams never double up.
 */
export default function Assurances() {
  return (
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
  );
}
