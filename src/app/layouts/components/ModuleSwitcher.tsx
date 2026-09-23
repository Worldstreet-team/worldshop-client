import { useEffect, useRef } from "react";
import {
  Banknote,
  BarChart3,
  GraduationCap,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * The ecosystem switcher behind the pill's chevron: every WorldStreet surface,
 * with this one marked as where you already are.
 *
 * Each module keeps its own domain accent from the token set, so the icon
 * colour is the same one that module's own UI is built on. Recognising the
 * colour is faster than reading the name.
 */

type Module = {
  name: string;
  href: string;
  Icon: LucideIcon;
  accent: string;
  current?: boolean;
};

const MODULES: Module[] = [
  { name: "Core Finance", href: "https://dashboard.worldstreetgold.com", Icon: Banknote, accent: "var(--ws-prim-gold-600)" },
  { name: "Social", href: "https://social.worldstreetgold.com", Icon: MessageSquare, accent: "var(--ws-domain-social-accent)" },
  { name: "Vivid AI", href: "https://vivid.worldstreetgold.com", Icon: Sparkles, accent: "var(--ws-domain-vivid-accent)" },
  { name: "Xstream", href: "https://xstream.worldstreetgold.com", Icon: Zap, accent: "var(--ws-domain-xstream-accent)" },
  { name: "Marketplace", href: "/", Icon: ShoppingBag, accent: "var(--ws-domain-marketplace-accent)", current: true },
  { name: "Vision", href: "https://vision.worldstreetgold.com", Icon: Video, accent: "var(--ws-domain-vision-accent)" },
  { name: "Academy", href: "https://academy.worldstreetgold.com", Icon: GraduationCap, accent: "var(--ws-domain-academy-accent)" },
  { name: "Prediction", href: "https://prediction.worldstreetgold.com", Icon: BarChart3, accent: "var(--ws-domain-prediction-accent)" },
];

export default function ModuleSwitcher({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the panel itself rather than the first module: opening this should
    // not look like Core Finance is about to be chosen.
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Deferred, or the click that opened it closes it in the same tick.
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      clearTimeout(t);
    };
  }, [onClose]);

  return (
    <div className="ws-modules" role="dialog" aria-label="Switch module" aria-modal="false">
      <div className="ws-modules__panel" ref={panelRef} tabIndex={-1}>
        {MODULES.map(({ name, href, Icon, accent, current }) => (
          <a
            key={name}
            href={href}
            className={`ws-modules__item${current ? " is-current" : ""}`}
            {...(current ? { "aria-current": "page" as const } : { target: "_blank", rel: "noopener noreferrer" })}
            onClick={onClose}
          >
            <span className="ws-modules__icon" style={{ "--m": accent } as React.CSSProperties}>
              <Icon size={16} aria-hidden />
            </span>
            <span className="ws-modules__name">{name}</span>
            {current && <span className="ws-modules__badge">Current</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
