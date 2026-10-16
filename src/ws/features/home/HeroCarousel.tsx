"use client";

import { AnimatePresence, m, type PanInfo, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@ws/components/icons";
import { HeroStage } from "@ws/components/three/HeroStage";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import type { HeroSlide } from "@ws/lib/copy/trust";
import { ease, spring } from "@ws/lib/motion/tokens";

/*
 * HeroCarousel (spec §4, flows R-015, audit F8/F14, EC-031), on the WAI-ARIA APG
 * carousel pattern:
 * - At most `rules.home.maxHeroSlides` slides, each a group labelled "2 of 3", with a
 *   visible "2 / 3" counter instead of dots.
 * - The rotation control comes first in the tab order. Rotation starts only when
 *   motion is allowed (never under reduced motion), holds while the pointer or focus
 *   is in the hero, and stops for good once the buyer changes slide themselves.
 * - Slide changes are announced only when the buyer is in control (aria-live is off
 *   while it rotates).
 * - Swipe on touch, with Previous and Next buttons as the single-pointer alternative
 *   (WCAG 2.5.7).
 * The 3D backdrop turns a third of the way round with each slide.
 */

const slideVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 56 : -56 }),
  center: { opacity: 1, x: 0, transition: { ...spring.soft, staggerChildren: 0.06, delayChildren: 0.04 } },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -40 : 40, transition: { duration: 0.2, ease: ease.in } }),
};

const lineVariants: Variants = {
  enter: { opacity: 0, y: 14, filter: "blur(6px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)", transition: spring.soft },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const REDUCED = "(prefers-reduced-motion: reduce)";
const onMotionChange = (cb: () => void) => {
  const mq = matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** False on the server and before hydration, so rotation never starts without scripts. */
const useMotionAllowed = () =>
  useSyncExternalStore(
    onMotionChange,
    () => !matchMedia(REDUCED).matches,
    () => false,
  );

export function HeroCarousel({ slides }: { slides: readonly HeroSlide[] }) {
  const count = slides.length;
  const [[index, dir], setPosition] = useState<[number, number]>([0, 0]);
  const [turns, setTurns] = useState(0);
  // null = the buyer hasn't chosen; then it rotates only if motion is allowed (R-015).
  const [choice, setChoice] = useState<boolean | null>(null);
  const motionAllowed = useMotionAllowed();
  const playing = count > 1 && (choice ?? motionAllowed);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const dragged = useRef(false);

  const go = (step: number) => {
    setPosition(([i]) => [(i + step + count) % count, step]);
    setTurns((t) => t + step);
  };
  // The buyer took over: rotation stops until they press Play (APG).
  const goByHand = (step: number) => {
    setChoice(false);
    go(step);
  };

  const rotating = playing && !hovered && !focused;
  useEffect(() => {
    if (!rotating) return;
    const timer = setTimeout(() => go(1), rules.home.heroAutoplayMs);
    return () => clearTimeout(timer);
    // `go` only uses setters; the timer restarts whenever the slide changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotating, index]);

  const onDragStart = () => {
    dragged.current = true;
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -50 || info.velocity.x < -400) goByHand(1);
    else if (info.offset.x > 50 || info.velocity.x > 400) goByHand(-1);
    // A drag that ends over a link mustn't also follow it.
    setTimeout(() => (dragged.current = false), 0);
  };

  const slide = slides[index];
  if (!slide) return null;

  return (
    <section
      className="ws-hero"
      aria-roledescription="carousel"
      aria-label="Highlights"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
    >
      <HeroStage className="ws-hero__stage" step={turns} />
      <div className="ws-hero__scrim" aria-hidden="true" />

      {count > 1 && (
        <div className="ws-hero__controls">
          <button
            type="button"
            className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-hero__control" })}
            aria-label={playing ? "Pause slides" : "Play slides"}
            onClick={() => setChoice(!playing)}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-hero__control" })}
            aria-label="Previous slide"
            onClick={() => goByHand(-1)}
          >
            <ArrowLeftIcon />
          </button>
          <span className="ws-hero__count cx-num" aria-hidden="true">
            {index + 1} / {count}
          </span>
          <button
            type="button"
            className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: "ws-hero__control" })}
            aria-label="Next slide"
            onClick={() => goByHand(1)}
          >
            <ArrowRightIcon />
          </button>
        </div>
      )}

      <m.div
        className="ws-hero__slides"
        aria-live={rotating ? "off" : "polite"}
        drag={count > 1 ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragSnapToOrigin
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {/* Every slide's copy, invisible, in the same cell: the hero is always as tall as
            its longest slide, so rotating never moves the page (CLS). */}
        {slides.map((s) => (
          <div key={s.id} className="ws-hero__slide ws-hero__sizer" aria-hidden="true" inert>
            <p className="ws-hero__eyebrow">{s.eyebrow}</p>
            <p className="ws-hero__title">{s.title}</p>
            <p className="ws-hero__body">{s.body}</p>
            <span className={buttonClass({ variant: "ghost", arrow: true, className: "ws-hero__cta" })}>
              {s.cta.label}
              <ArrowRightIcon />
            </span>
          </div>
        ))}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <m.div
            key={slide.id}
            className="ws-hero__slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <m.p className="ws-hero__eyebrow" variants={lineVariants}>
              {slide.eyebrow}
            </m.p>
            <m.h2 className="ws-hero__title" variants={lineVariants}>
              {slide.title}
            </m.h2>
            <m.p className="ws-hero__body" variants={lineVariants}>
              {slide.body}
            </m.p>
            <m.div variants={lineVariants}>
              {/* Ghost: the search button is the page's one solid gold button (spec §1.1). */}
              <Link href={slide.cta.href} className={buttonClass({ variant: "ghost", arrow: true, className: "ws-hero__cta" })} draggable={false}>
                {slide.cta.label}
                <ArrowRightIcon />
              </Link>
            </m.div>
          </m.div>
        </AnimatePresence>
      </m.div>
    </section>
  );
}
