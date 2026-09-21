import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export type SectionHeadProps = {
  id: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: { label: string; to: string };
};

export default function SectionHead({
  id,
  eyebrow,
  title,
  sub,
  action,
}: SectionHeadProps) {
  return (
    <div className="ws-sectionhead">
      <div>
        {eyebrow && <span className="ws-sectionhead__eyebrow">{eyebrow}</span>}
        <h2 className="ws-sectionhead__title" id={id}>
          {title}
        </h2>
        {sub && <p className="ws-sectionhead__sub">{sub}</p>}
      </div>
      {action && (
        <Link to={action.to} className="ws-sectionhead__action">
          {action.label}
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}
