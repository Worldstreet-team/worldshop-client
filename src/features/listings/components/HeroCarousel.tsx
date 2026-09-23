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
    return () => clearInterval(t);
  }, [paused, reducedMotion, SLIDES.length]);

  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);

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
      className="ws-hero"
      aria-roledescription="carousel"
      aria-label="Marketplace highlights"
      style={{ "--ws-hero-advance": `${ADVANCE_MS}ms` } as React.CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
      data-paused={paused || undefined}
    >
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
            </div>
          </div>
        ))}
      </div>

      <div className="ws-wrap ws-hero__navwrap">
        <div className="ws-hero__nav">
          <button
            type="button"
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
      </div>

      <p className="ws-sr" aria-live="polite">
        {`Slide ${index + 1} of ${SLIDES.length}: ${SLIDES[index].eyebrow}`}
      </p>
    </section>
  );
}
