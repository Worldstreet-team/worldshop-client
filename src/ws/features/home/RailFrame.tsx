"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@ws/components/icons";
import { RevealOnScroll } from "@ws/components/motion/RevealOnScroll";
import { buttonClass } from "@ws/components/ui";

/* The client half of ProductRail: header with eyebrow, title, "See all" and the
   desktop arrows, over a row that scrolls sideways with snap points (2.3 cards on
   phones, with a peek). Arrows move a screenful and grey out at the ends; phones
   swipe, and every card is reachable with Tab. Cards rise in once (spec "Reveal once"). */

type Props = {
  titleId: string;
  eyebrow: string;
  title: string;
  seeAll: { href: string; label: string; srLabel: string };
  count: number;
  children: ReactNode;
};

export function RailFrame({ titleId, eyebrow, title, seeAll, count, children }: Props) {
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = el.scrollWidth - el.clientWidth;
        setEnds({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
      });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, []);

  const scroll = (direction: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: smooth ? "smooth" : "auto" });
  };

  return (
    <>
      <div className="ws-home-head ws-home-head--rail">
        <div className="ws-home-head__text">
          <p className="ws-home-head__eyebrow">{eyebrow}</p>
          <h2 id={titleId} className="ws-home-head__title">
            {title}
          </h2>
        </div>
        <div className="ws-home-head__actions">
          <Link href={seeAll.href} className="cx-link ws-home-head__all">
            {seeAll.label}
            <span className="cx-sr-only"> {seeAll.srLabel}</span>
          </Link>
          <button
            type="button"
            className={buttonClass({ variant: "ghost", size: "sm", icon: true, className: "ws-rail__arrow" })}
            aria-label="Scroll back"
            aria-controls={listId}
            disabled={ends.start}
            onClick={() => scroll(-1)}
          >
            <ArrowLeftIcon />
          </button>
          <button
            type="button"
            className={buttonClass({ variant: "ghost", size: "sm", icon: true, className: "ws-rail__arrow" })}
            aria-label="Scroll forward"
            aria-controls={listId}
            disabled={ends.end}
            onClick={() => scroll(1)}
          >
            <ArrowRightIcon />
          </button>
        </div>
      </div>
      <RevealOnScroll count={count}>
        <ul ref={list} id={listId} className="ws-rail__list" aria-labelledby={titleId}>
          {children}
        </ul>
      </RevealOnScroll>
    </>
  );
}
