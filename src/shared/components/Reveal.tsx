import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

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
  as?: 'div' | 'section' | 'li' | 'article';
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

  const Tag = as as ElementType;
  return (
    <Tag {...rest} ref={ref} data-reveal="" style={merged}>
      {children}
    </Tag>
  );
}
