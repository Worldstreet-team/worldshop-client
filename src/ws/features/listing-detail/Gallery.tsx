"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ArrowLeftIcon, ArrowRightIcon, XmarkCircleIcon } from "@ws/components/icons";
import { Morph } from "@ws/components/motion/Morph";
import { PhotoViewer3D } from "@ws/components/three/PhotoViewer3D";
import { buttonClass } from "@ws/components/ui";
import { cx } from "@ws/lib/cx";
import type { ListingMedia } from "@ws/lib/data/types";
import { judge3D, reportDevice } from "@ws/lib/three/capability";

/*
 * Gallery + GalleryLightbox (spec §7). The photos are one strip that scrolls sideways
 * with snap points, so phones swipe it natively and it works before scripts load. On
 * top: thumbnails beside it on desktop, arrows, ← → keys, a "2 / 6" counter, a
 * full-screen viewer (native dialog: Escape closes, focus returns), and the 3D photo
 * ring on devices that can run it (owner's pick). Photo 1 loads first (LCP) and keeps
 * the card's morph name; the rest load lazily.
 */

type Props = { listingId: string; title: string; media: readonly ListingMedia[]; children?: React.ReactNode };

const noop = () => () => {};
const can3D = () => judge3D(reportDevice()).ok;

export function Gallery({ listingId, title, media, children }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLDivElement>(null);
  const lightbox = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [threeD, setThreeD] = useState(false);
  const capable = useSyncExternalStore(noop, can3D, () => false);
  const count = media.length;

  // Which photo is in view (swipes, arrows and thumbnails all scroll the strip).
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll("[data-index]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [threeD]);

  const scrollTo = (el: HTMLDivElement | null, i: number) => {
    const target = el?.querySelector<HTMLElement>(`[data-index="${(i + count) % count}"]`);
    target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "start" });
  };
  const go = (step: number) => scrollTo(strip.current, index + step);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    go(e.key === "ArrowRight" ? 1 : -1);
  };
  const openLightbox = (i: number) => {
    lightbox.current?.showModal();
    requestAnimationFrame(() => {
      const target = big.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
      target?.scrollIntoView({ block: "nearest", inline: "start" });
    });
  };

  if (count === 0) return null;
  const alt = (m: ListingMedia, i: number) => (m.alt && i === 0 ? m.alt : `${title}, photo ${i + 1} of ${count}`);

  return (
    <section className="ws-gallery" aria-label="Photos">
      {count > 1 && (
        <ul className="ws-gallery__thumbs" aria-label="Choose a photo">
          {media.map((m, i) => (
            <li key={m.url + i}>
              <button type="button" className="ws-gallery__thumb" aria-current={i === index ? "true" : undefined} aria-label={`Photo ${i + 1} of ${count}`} onClick={() => (setThreeD(false), scrollTo(strip.current, i))}>
                <Image src={m.url} alt="" fill sizes="72px" quality={60} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="ws-gallery__main">
        {threeD ? (
          <PhotoViewer3D media={media} />
        ) : (
          <div
            ref={strip}
            className="ws-gallery__strip"
            tabIndex={0}
            role="group"
            aria-roledescription="carousel"
            aria-label={`Photos, ${index + 1} of ${count}. Use the arrow keys to move.`}
            onKeyDown={onKey}
          >
            {media.map((m, i) => {
              const img = (
                <Image
                  src={m.url}
                  alt={alt(m, i)}
                  fill
                  sizes="(min-width: 1024px) 560px, 100vw"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                />
              );
              return (
                <button type="button" key={m.url + i} data-index={i} className="ws-gallery__slide" tabIndex={-1} aria-label={`View photo ${i + 1} full screen`} onClick={() => openLightbox(i)}>
                  {i === 0 ? <Morph name={`photo-${listingId}`}>{img}</Morph> : img}
                </button>
              );
            })}
          </div>
        )}

        {!threeD && count > 1 && (
          <>
            <button type="button" className={cx(buttonClass({ variant: "quiet", size: "sm", icon: true }), "ws-gallery__arrow ws-gallery__arrow--prev")} aria-label="Previous photo" onClick={() => go(-1)}>
              <ArrowLeftIcon />
            </button>
            <button type="button" className={cx(buttonClass({ variant: "quiet", size: "sm", icon: true }), "ws-gallery__arrow ws-gallery__arrow--next")} aria-label="Next photo" onClick={() => go(1)}>
              <ArrowRightIcon />
            </button>
            <span className="ws-gallery__count cx-num" aria-hidden="true">
              {index + 1} / {count}
            </span>
          </>
        )}
        {children}
        {capable && count >= 3 && (
          <button type="button" className={cx(buttonClass({ variant: "ghost", size: "sm" }), "ws-gallery__3d")} aria-pressed={threeD} onClick={() => setThreeD((v) => !v)}>
            {threeD ? "Back to photos" : "View in 3D"}
          </button>
        )}
      </div>

      <dialog ref={lightbox} className="ws-lightbox" aria-label={`${title}: photos`}>
        <div className="ws-lightbox__bar">
          <span className="cx-num">{count} photos</span>
          <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Close photos" onClick={() => lightbox.current?.close()}>
            <XmarkCircleIcon />
          </button>
        </div>
        <div ref={big} className="ws-lightbox__strip" tabIndex={0} role="group" aria-label="Photos, full screen. Use the arrow keys to move." onKeyDown={(e) => {
          const el = big.current;
          if (!el || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
          e.preventDefault();
          el.scrollBy({ left: e.key === "ArrowRight" ? el.clientWidth : -el.clientWidth });
        }}>
          {media.map((m, i) => (
            <figure key={m.url + i} data-index={i} className="ws-lightbox__slide">
              <Image src={m.url} alt={alt(m, i)} fill sizes="100vw" loading="lazy" />
              <figcaption className="cx-num">
                {i + 1} / {count}
              </figcaption>
            </figure>
          ))}
        </div>
      </dialog>
    </section>
  );
}
