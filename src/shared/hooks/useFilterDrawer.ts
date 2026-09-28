import { useEffect, useState } from 'react';

const DESKTOP = '(min-width: 1024px)';

/**
 * The filter sheet's open state below the desktop breakpoint, where it is a
 * drawer over the page: Escape closes it, the page behind it does not scroll,
 * and growing past the breakpoint drops it back into the layout.
 */
export function useFilterDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia(DESKTOP);
    if (mq.matches) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', close);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', close);
    };
  }, [open]);

  return { open, setOpen };
}
