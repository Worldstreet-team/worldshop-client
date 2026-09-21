import Reveal from "@/shared/components/Reveal";
import { ASSURANCES } from "@/features/listings/content/home";

export default function Assurances() {
  return (
    <Reveal as="section" className="ws-assure" aria-label="How WorldStore works">
      {ASSURANCES.map(({ Icon, title, copy }) => (
        <div className="ws-assure__item" key={title}>
          <span className="ws-assure__icon" aria-hidden>
            <Icon size={17} />
          </span>
          <h3 className="ws-assure__title">{title}</h3>
          <p className="ws-assure__copy">{copy}</p>
        </div>
      ))}
    </Reveal>
  );
}
