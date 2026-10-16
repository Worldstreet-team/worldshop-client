"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import type { NavCategory } from "./categories";

/* CategoryRail (spec §3.1): All first, every category, then Saved. It sits under the
   sticky header in the page, so it scrolls away with the page (audit F17) rather than
   adding to the sticky chrome. Swipe on phones; arrows and faded edges on desktop when
   it overflows. The current category is marked aria-current. */
export function CategoryRail({ categories }: { categories: readonly Pick<NavCategory, "id" | "name">[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const list = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setEnds({ start: el.scrollLeft <= 2, end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 2 }));
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const size = new ResizeObserver(measure);
    size.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      size.disconnect();
    };
  }, []);

  const cat = pathname === "/search" ? params.get("cat") : null;
  const pills = [
    { href: "/search", label: "All", current: pathname === "/search" && !cat },
    ...categories.map((c) => ({ href: `/search?cat=${c.id}`, label: c.name, current: cat === c.id })),
    { href: "/saved", label: "Saved", current: pathname === "/saved" },
  ];
  const scroll = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // A listing has its own breadcrumb; the rail would push the photos down. Inbox and
  // Offers fill the screen with the chat, so it would push the composer off it.
  if (["/listing/", "/inbox", "/offers"].some((p) => pathname.startsWith(p))) return null;
  return (
    <nav aria-label="Categories" className="ws-catrail" data-start={ends.start} data-end={ends.end}>
      <div className="cx-container ws-catrail__inner">
        <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-catrail__arrow ws-catrail__arrow--prev" })} aria-label="Scroll categories back" disabled={ends.start} onClick={() => scroll(-1)}>
          <ArrowLeftIcon />
        </button>
        <ul ref={list} className="ws-catrail__list">
          {pills.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="cx-chip ws-catrail__pill" aria-current={p.current ? "page" : undefined}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
        <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-catrail__arrow ws-catrail__arrow--next" })} aria-label="Scroll categories forward" disabled={ends.end} onClick={() => scroll(1)}>
          <ArrowRightIcon />
        </button>
      </div>
    </nav>
  );
}
