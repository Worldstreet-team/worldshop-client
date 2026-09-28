<<<<<<< HEAD
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Promo hero, ported from the design sandbox: full-bleed photography with a
 * scrim carrying the copy, on a scroll-snap track.
 *
 * The track is the source of truth for which slide is showing rather than a
 * state variable driving a transform — that way a swipe, an arrow and the dots
 * cannot disagree, and the browser does the easing. Autoplay stops on hover,
 * focus and under prefers-reduced-motion.
 */

const ADVANCE_MS = 6500;

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  sub: string;
  cta: { label: string; to: string };
  art: string;
  alt: string;
};

function slides(motorsTo: string): Slide[] {
  return [
    {
      key: "fashion",
      eyebrow: "Fashion week",
      title: "Up to 50% off fashion",
      sub: "Verified sellers across Lagos and Abuja. Free delivery on selected pieces.",
      cta: { label: "Shop fashion", to: "/listings" },
      art: "/img/hero/bags.jpg",
      alt: "A shopper in sunglasses carrying several shopping bags",
    },
    {
      key: "boutiques",
      eyebrow: "New this week",
      title: "Fresh from local boutiques",
      sub: "Two hundred new listings from shops you can visit in person.",
      cta: { label: "Browse listings", to: "/listings" },
      art: "/img/hero/store.jpg",
      alt: "A clothing boutique with shelves of folded shirts",
    },
    {
      key: "motors",
      eyebrow: "Motors",
      title: "Your next ride is listed",
      sub: "Foreign used, Nigerian used and brand new. Inspect it in person and pay the seller directly.",
      cta: { label: "Browse vehicles", to: motorsTo },
      art: "/img/hero/shop.jpg",
      alt: "An illuminated open sign in a shop window",
    },
  ];
}

export default function HeroCarousel({ motorsTo }: { motorsTo: string; stat?: number }) {
  const items = slides(motorsTo);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Scroll to the slide's own offsetLeft rather than index * width: the track
  // has a 16px gap, so stepping by width alone drifts one gap per slide.
  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[(i + items.length) % items.length] as HTMLElement | undefined;
    if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  };

  // Read the position back off the track so a manual swipe updates the dots.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Nearest slide by offset, for the same reason goTo uses it.
        const offsets = [...track.children].map((c) => (c as HTMLElement).offsetLeft);
        let nearest = 0;
        offsets.forEach((o, i) => {
          if (Math.abs(o - track.scrollLeft) < Math.abs(offsets[nearest] - track.scrollLeft)) nearest = i;
        });
        setIndex(nearest);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Autoplay wraps even though the arrows stop at the ends: a rotating promo
    // that halts on the last slide reads as broken.
    const t = setInterval(() => goTo((index + 1) % items.length), ADVANCE_MS);
=======
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { heroSlides } from "@/features/listings/content/heroSlides";

const ADVANCE_MS = 4500;

export default function HeroCarousel({
  motorsTo,
}: {
  motorsTo: string;
  stat: number;
}) {
  const SLIDES = useMemo(() => heroSlides(motorsTo), [motorsTo]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      ADVANCE_MS,
    );
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
    return () => clearInterval(t);
  }, [index, paused]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  return (
    <section
      className="ws-carousel"
      aria-roledescription="carousel"
<<<<<<< HEAD
      aria-label="Promotions"
=======
      aria-label="Marketplace highlights"
      style={{ "--ws-hero-advance": `${ADVANCE_MS}ms` } as React.CSSProperties}
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      data-paused={paused || undefined}
    >
<<<<<<< HEAD
      {/* The viewport is the positioning context: the arrows overlay the image
          rather than sitting under it, as they do in the sandbox. */}
      <div className="ws-promo__viewport">
        <div className="ws-carousel__track ws-carousel__track--hero" ref={trackRef} tabIndex={-1}>
          {items.map((s, i) => (
            <div
              key={s.key}
              className="ws-carousel__item"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
            >
              <article className="ws-promo__slide">
                <img className="ws-promo__art" src={s.art} alt={s.alt} />
                <div className="ws-promo__scrim" aria-hidden />
                <div className="ws-promo__body">
                  <p className="ws-promo__eyebrow">{s.eyebrow}</p>
                  <h2 className="ws-promo__title">{s.title}</h2>
                  <p className="ws-promo__sub">{s.sub}</p>
                  <Link className="ws-btn ws-btn--primary ws-promo__cta" to={s.cta.to}>
                    {s.cta.label}
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                </div>
              </article>
=======
      <div className="ws-hero__bgs" aria-hidden>
        {SLIDES.map((s, i) => (
          <div
            key={s.key}
            className={`ws-hero__bg${i === index ? " is-active" : ""}`}
          >
            {s.bg.video && !reducedMotion ? (
              <video
                className="ws-hero__bgmedia"
                style={{ objectPosition: s.bg.focus }}
                src={s.bg.video}
                poster={s.bg.poster ?? s.bg.image}
                muted
                loop
                playsInline
                autoPlay
                preload={i === 0 ? "metadata" : "none"}
              />
            ) : (
              <img
                className="ws-hero__bgmedia"
                style={{ objectPosition: s.bg.focus }}
                src={s.bg.poster ?? s.bg.image}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
        ))}
        <div className="ws-hero__scrim" />
      </div>

      <div className="ws-wrap ws-hero__inner">
        {SLIDES.map((s, i) => (
          <div
            key={s.key}
            className={`ws-hero__slide${i === index ? " is-active" : ""}`}
            aria-hidden={i !== index}
          >
            <div className="ws-hero__copy">
              <h2
                className="ws-hero__title"
                data-rise
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {s.title}
              </h2>
              <p
                className="ws-hero__sub"
                data-rise
                style={{ "--i": 2 } as React.CSSProperties}
              >
                {s.sub}
              </p>
              <div
                className="ws-hero__ctas"
                data-rise
                style={{ "--i": 3 } as React.CSSProperties}
              >
                <Link
                  to={s.primary.to}
                  className="ws-btn ws-btn--primary"
                  tabIndex={i === index ? 0 : -1}
                >
                  {s.primary.icon}
                  {s.primary.label}
                </Link>
                {s.secondary && (
                  <Link
                    to={s.secondary.to}
                    className="ws-btn ws-btn--secondary"
                    tabIndex={i === index ? 0 : -1}
                  >
                    {s.secondary.icon}
                    {s.secondary.label}
                  </Link>
                )}
              </div>
            </div>

            <div className={`ws-hero__art ws-hero__art--${s.art}`} aria-hidden>
              {s.cuts.map((c) => (
                <img
                  key={c.mod}
                  src={c.src}
                  alt=""
                  className={`ws-hero__cut ws-hero__cut--${c.mod}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ))}
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
            </div>
          ))}
        </div>

        {/* Disabled at the ends rather than wrapping, matching the sandbox.
            Hidden on narrow screens, where the track is swiped instead. */}
        <button
          type="button"
          className="ws-promo__arrow ws-promo__arrow--prev"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} aria-hidden />
        </button>
        <button
          type="button"
          className="ws-promo__arrow ws-promo__arrow--next"
          onClick={() => goTo(index + 1)}
          disabled={index === items.length - 1}
          aria-label="Next slide"
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      <div className="ws-promo__dots" role="tablist" aria-label="Carousel pages">
        {items.map((s, i) => (
          <button
            key={s.key}
            type="button"
<<<<<<< HEAD
            role="tab"
            aria-selected={i === index}
            aria-label={`Page ${i + 1} of ${items.length}`}
            className={`ws-promo__dot${i === index ? " is-active" : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
=======
            className="ws-iconbtn ws-hero__arrow"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="ws-hero__bars" role="tablist" aria-label="Slides">
            {SLIDES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1} of ${SLIDES.length}: ${s.eyebrow}`}
                className={`ws-hero__bar${i === index ? " is-active" : ""}`}
                onClick={() => go(i)}
              >
                <span className="ws-hero__barfill" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ws-iconbtn ws-hero__arrow"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
>>>>>>> f2905ba02d9a957cf3bd05ef9c9548fb9d9014ee
      </div>

      <p className="ws-sr" aria-live="polite">
        {`Slide ${index + 1} of ${SLIDES.length}: ${SLIDES[index].eyebrow}`}
      </p>
    </section>
  );
}
