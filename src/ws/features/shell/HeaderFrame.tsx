"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* The sticky header's behaviour (spec §3.1, audit F17). CSS does the shrink (a negative
   sticky top lets the utility or logo row scroll away); this marks when the page has
   scrolled (for the shadow) and publishes the stuck height as --cx-sticky-offset, so
   sticky bars and scroll targets sit below it. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current!;
    // On <body>: the brand block there declares the token, so <html> would be shadowed.
    const root = document.body;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrolled = window.scrollY > 48;
        if ((el.dataset.scrolled === "true") !== scrolled) el.dataset.scrolled = String(scrolled);
      });
    };
    // What stays on screen once stuck: the header minus the row that slides away.
    const size = new ResizeObserver(() => {
      const collapse = parseFloat(getComputedStyle(el).getPropertyValue("--ws-header-collapse")) || 0;
      root.style.setProperty("--cx-sticky-offset", `${el.offsetHeight - collapse}px`);
    });
    size.observe(el);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--cx-sticky-offset");
    };
  }, []);

  return (
    <header ref={ref} className="ws-header" data-scrolled="false">
      {children}
    </header>
  );
}
