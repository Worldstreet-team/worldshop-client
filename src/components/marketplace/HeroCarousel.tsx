import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react';

/**
 * Rotating hero in the eBay mold: a few tall promo slides, auto-advancing,
 * with arrows and dots. Slides are compositions of product cutouts (PNGs with
 * alpha, in /img/hero/) rather than photo cards — the contour drop-shadows are
 * what make them read as objects instead of pictures.
 *
 * Autoplay pauses on hover/focus and never runs under prefers-reduced-motion.
 * A cutout that fails to load hides itself, so a missing file degrades to a
 * sparser composition instead of a broken-image icon.
 */

const ADVANCE_MS = 6500;

type Cut = { src: string; mod: string };

type Slide = {
  key: string;
  eyebrow: string;
  title: ReactNode;
  sub: string;
  primary: { label: string; to: string; icon?: ReactNode };
  secondary?: { label: string; to: string; icon?: ReactNode };
  art: string;
  cuts: Cut[];
};

function slides(motorsTo: string): Slide[] {
  return [
    {
      key: 'marketplace',
      eyebrow: 'The WorldStreet marketplace',
      title: <>Everything Nigeria is <em>selling</em>.</>,
      sub: 'Phones, cars, fashion, property — new listings from rated stores every day. Chat directly with the seller and agree your own terms.',
      primary: { label: 'Browse listings', to: '/listings' },
      secondary: { label: 'Open a store', to: '/vendor', icon: <Store size={16} aria-hidden /> },
      art: 'electronics',
      cuts: [
        { src: '/img/hero/macbook.webp', mod: 'macbook' },
        { src: '/img/hero/phones.webp', mod: 'phones' },
        { src: '/img/hero/boombox.webp', mod: 'boombox' },
      ],
    },
    {
      key: 'motors',
      eyebrow: 'Motors',
      title: <>Your next ride is <em>listed</em>.</>,
      sub: 'Foreign used, Nigerian used, brand new — inspect it in person and pay the seller directly.',
      primary: { label: 'Browse vehicles', to: motorsTo },
      art: 'motors',
      cuts: [
        { src: '/img/hero/gle-black.webp', mod: 'gle-black' },
        { src: '/img/hero/gle-white.webp', mod: 'gle-white' },
      ],
    },
    {
      key: 'sellers',
      eyebrow: 'For sellers',
      title: <>Turn your stuff into <em>cash</em>.</>,
      sub: 'Open a store in minutes and talk to buyers directly — no commission on what you sell.',
      primary: { label: 'Open a store', to: '/vendor', icon: <Store size={16} aria-hidden /> },
      art: 'lifestyle',
      cuts: [
        { src: '/img/hero/tudor.webp', mod: 'tudor' },
        { src: '/img/hero/af1.webp', mod: 'af1' },
      ],
    },
  ];
}

export default function HeroCarousel({ motorsTo, stat }: { motorsTo: string; stat: number }) {
  const SLIDES = useMemo(() => slides(motorsTo), [motorsTo]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    if (paused || reducedMotion) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), ADVANCE_MS);
    return () => clearInterval(t);
  }, [paused, reducedMotion, SLIDES.length]);

  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);

  return (
    <section
      className="ws-hero"
      aria-roledescription="carousel"
      aria-label="Marketplace highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="ws-hero__track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.key}
            className={`ws-hero__slide${i === index ? ' is-active' : ''}`}
            aria-hidden={i !== index}
          >
            <div className="ws-hero__copy">
              <p className="ws-hero__eyebrow">{s.eyebrow}</p>
              <h2 className="ws-hero__title">{s.title}</h2>
              <p className="ws-hero__sub">{s.sub}</p>
              <div className="ws-hero__ctas">
                <Link to={s.primary.to} className="ws-btn ws-btn--primary" tabIndex={i === index ? 0 : -1}>
                  {s.primary.icon}
                  {s.primary.label}
                </Link>
                {s.secondary && (
                  <Link to={s.secondary.to} className="ws-btn ws-btn--secondary" tabIndex={i === index ? 0 : -1}>
                    {s.secondary.icon}
                    {s.secondary.label}
                  </Link>
                )}
              </div>
              {i === 0 && stat > 0 && (
                <p className="ws-hero__stat ws-num">
                  {stat.toLocaleString('en-NG')} live listings right now
                </p>
              )}
            </div>

            <div className={`ws-hero__art ws-hero__art--${s.art}`} aria-hidden>
              {s.cuts.map((c) => (
                <img
                  key={c.mod}
                  src={c.src}
                  alt=""
                  className={`ws-hero__cut ws-hero__cut--${c.mod}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="ws-hero__nav">
        <button
          type="button"
          className="ws-iconbtn ws-hero__arrow"
          onClick={() => go(index - 1)}
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="ws-hero__dots" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}: ${s.eyebrow}`}
              className={`ws-hero__dot${i === index ? ' is-active' : ''}`}
              onClick={() => go(i)}
            />
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
    </section>
  );
}
