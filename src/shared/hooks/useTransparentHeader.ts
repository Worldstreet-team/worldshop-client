import { useEffect, useState } from 'react';

const TOP_THRESHOLD = 4;
const MAX_ATTEMPTS = 60;

export function useTransparentHeader(enabled: boolean) {
  const [atTop, setAtTop] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    let hasHero = false;
    let attempts = 0;

    const measure = () => {
      frame = 0;
      if (!hasHero) hasHero = Boolean(document.querySelector('.ws-hero'));
      setAtTop(hasHero && window.scrollY <= TOP_THRESHOLD);
      if (!hasHero && attempts++ < MAX_ATTEMPTS) frame = requestAnimationFrame(measure);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    frame = requestAnimationFrame(measure);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);

  return enabled && atTop;
}
