"use client";

import { AnimatePresence, m, type PanInfo } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon } from "@ws/components/icons";
import { Morph } from "@ws/components/motion/Morph";
import { rules } from "@ws/config/marketplace-rules";
import type { ListingMedia } from "@ws/lib/data/types";
import { plural } from "@ws/lib/format";
import { spring } from "@ws/lib/motion/tokens";

/*
 * Step through a listing's photos from its card (UI research C1, decided 6 Oct; eBay
 * and Etsy do this). Desktop: arrows on hover, dots under the photo. Phones: swipe,
 * with a "2/6" counter. A tap or click that isn't a swipe opens the listing, so the
 * photo still behaves like the card's link. Only the first photo loads up front; the
 * others mount on the first hover or touch. Arrows aren't in the tab order: keyboard
 * and screen-reader users get every photo in the listing gallery (logged deviation).
 */

type Props = {
  /** Names the photo for the card → listing morph (React ViewTransition). */
  listingId: string;
  media: readonly ListingMedia[];
  href: string;
  sizes: string;
  load: "high" | "eager" | "lazy";
  quality?: number;
};

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0.4, scale: 1.04 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? "-35%" : "35%", opacity: 0, scale: 0.96 }),
};

export function CardPhotos({ listingId, media, href, sizes, load, quality }: Props) {
  const router = useRouter();
  const photos = media.slice(0, rules.card.photosMax);
  const [[index, dir], setIndex] = useState<[number, number]>([0, 0]);
  const [awake, setAwake] = useState(false);
  const many = photos.length > 1;
  const photo = photos[index];

  const go = (step: number) => setIndex(([i]) => [(i + step + photos.length) % photos.length, step]);
  const stop = (e: MouseEvent | ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const open = (e: globalThis.MouseEvent | globalThis.PointerEvent | globalThis.TouchEvent) => {
    const mod = "metaKey" in e && (e.metaKey || e.ctrlKey || e.shiftKey);
    if (mod) window.open(href, "_blank", "noopener");
    else router.push(href);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -40 || info.velocity.x < -350) go(1);
    else if (info.offset.x > 40 || info.velocity.x > 350) go(-1);
  };

  if (!photo) return null;
  const image = (p: ListingMedia, i: number) => (
    <Image
      src={p.url}
      alt={i === 0 ? p.alt : ""}
      fill
      sizes={sizes}
      quality={quality}
      draggable={false}
      loading={i === 0 ? (load === "lazy" ? "lazy" : "eager") : "eager"}
      fetchPriority={i === 0 && load === "high" ? "high" : undefined}
    />
  );

  if (!many) {
    return (
      <Morph name={`photo-${listingId}`}>
        <div className="ws-photos">{image(photo, 0)}</div>
      </Morph>
    );
  }

  return (
    <Morph name={`photo-${listingId}`}>
      <div className="ws-photos" onPointerEnter={() => setAwake(true)} onTouchStart={() => setAwake(true)}>
        <m.div
          className="ws-photos__track"
          drag={awake ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.35}
          dragSnapToOrigin
          onDragEnd={onDragEnd}
          onTap={open}
        >
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <m.div
              key={index}
              className="ws-photos__slide"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: spring.snappy, scale: spring.soft, opacity: { duration: 0.2 } }}
            >
              {image(photo, index)}
            </m.div>
          </AnimatePresence>
        </m.div>

        {awake && (
          <>
            <button type="button" tabIndex={-1} aria-hidden="true" className="ws-photos__arrow ws-photos__arrow--prev" onPointerDown={stop} onClick={(e) => (stop(e), go(-1))}>
              <ArrowLeftIcon />
            </button>
            <button type="button" tabIndex={-1} aria-hidden="true" className="ws-photos__arrow ws-photos__arrow--next" onPointerDown={stop} onClick={(e) => (stop(e), go(1))}>
              <ArrowRightIcon />
            </button>
            <div className="ws-photos__dots" aria-hidden="true">
              {photos.map((p, i) => (
                <m.span key={p.url + i} className="ws-photos__dot" animate={{ scale: i === index ? 1 : 0.6, opacity: i === index ? 1 : 0.55 }} transition={spring.snappy} />
              ))}
            </div>
          </>
        )}

        {/* eBay/spec PhotoCount: "2/6" (counts every photo, not only the steppable ones). */}
        <span className="ws-card__photos">
          <ImageIcon />
          <span aria-hidden="true">
            {index + 1}/{media.length}
          </span>
          <span className="cx-sr-only">{plural(media.length, "photo")}</span>
        </span>
        {/* Preload the next photo once awake, so a step never waits on the network. */}
        {awake && photos[(index + 1) % photos.length] && (
          <div className="ws-photos__preload" aria-hidden="true">
            {image(photos[(index + 1) % photos.length], 1)}
          </div>
        )}
      </div>
    </Morph>
  );
}
