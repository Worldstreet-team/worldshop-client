import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

/**
 * An element that rises in as it enters the viewport.
 *
 * Every instance registers itself with one shared IntersectionObserver on
 * mount — so a card that arrives after its data resolves is observed just the
 * same as a section that was there from the first render. That is the case a
 * page-level "query everything once" observer misses, and it left every late
 * card at opacity 0.
 *
 * The stylesheet only hides `[data-reveal]` once <html data-reveal="ready">
 * is set here, so without JavaScript nothing is ever hidden; under
 * prefers-reduced-motion elements are marked shown at once and no observer
 * is created.
 */

let observer: IntersectionObserver | null = null;

function shared(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
  }
  return observer;
}

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Props = HTMLAttributes<HTMLElement> & {
  /** which element to render — a section, a plain wrapper, a list item */
  as?: 'div' | 'section' | 'li' | 'article';
  /** position in a group; later items follow earlier ones by a beat */
  index?: number;
  children?: ReactNode;
};

export default function Reveal({ as = 'div', index, style, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      return;
    }
    document.documentElement.dataset.reveal = 'ready';
    const io = shared();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);

  const merged: CSSProperties =
    index === undefined ? (style ?? {}) : ({ ...style, '--reveal-i': index } as CSSProperties);

  // A dynamic tag in JSX rather than createElement: the same element, but the
  // ref is handed over as a prop the hooks lint recognises, not read in render.
  const Tag = as as ElementType;
  return (
    <Tag {...rest} ref={ref} data-reveal="" style={merged}>
      {children}
    </Tag>
  );
}
