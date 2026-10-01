import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
import { imageSrc, type ImageRef } from "@/features/listings/model";

type ListingGalleryProps = {
  images: ImageRef[];
  name: string;
};

/**
 * A thumbnail rail beside a square stage. The rail is a tablist: one tab stop,
 * arrows move between photos, and the stage is the panel they control.
 */
export default function ListingGallery({ images, name }: ListingGalleryProps) {
  const [active, setActive] = useState(0);
  const lightbox = useRef<HTMLDialogElement>(null);
  const thumbs = useRef<Array<HTMLButtonElement | null>>([]);
  const many = images.length > 1;

  const step = (delta: number) => {
    if (!many) return;
    setActive((i) => (i + delta + images.length) % images.length);
  };

  const onThumbKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = images.length - 1;
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    thumbs.current[next]?.focus();
  };

  if (images.length === 0) {
    return (
      <div className="ws-ldgallery">
        <div className="ws-ldgallery__stage">
          <div className="ws-pcard__noimg">
            <ImageOff size={24} aria-hidden />
            No photos
          </div>
        </div>
      </div>
    );
  }

  const position = `Photo ${active + 1} of ${images.length}`;

  return (
    <div className="ws-ldgallery">
      {/* The rail sits beside the stage only when this column is wide enough,
          which is a question about the gallery and not the viewport, so the
          wrapper is the query container and this grid is what responds. */}
      <div className={`ws-ldgallery__grid${many ? " ws-ldgallery__grid--rail" : ""}`}>
      {many && (
        <div className="ws-ldgallery__thumbs" role="tablist" aria-label="Photos" aria-orientation="vertical">
          {images.map((img, i) => (
            <button
              key={i}
              ref={(el) => { thumbs.current[i] = el; }}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Photo ${i + 1} of ${images.length}`}
              tabIndex={i === active ? 0 : -1}
              className="ws-ldgallery__thumb"
              onClick={() => setActive(i)}
              onKeyDown={(e) => onThumbKey(e, i)}
            >
              <img src={imageSrc(img)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div
        className="ws-ldgallery__stage"
        role={many ? "tabpanel" : undefined}
        aria-roledescription="gallery"
        aria-label={many ? position : `Photo of ${name}`}
      >
        <button
          type="button"
          className="ws-ldgallery__zoom"
          aria-label={`Open photo ${active + 1} full screen`}
          onClick={() => lightbox.current?.showModal()}
        >
          {/* Keyed so the fade replays on each photo rather than only the first. */}
          <img key={active} src={imageSrc(images[active])} alt={name} draggable={false} />
        </button>

        {many && (
          <span className="ws-ldgallery__count ws-num" aria-live="polite">
            {active + 1} of {images.length}
          </span>
        )}

        <span className="ws-ldgallery__expand" aria-hidden>
          <Maximize2 size={16} />
        </span>

        {many && (
          <>
            <button
              type="button"
              className="ws-ldgallery__nav ws-ldgallery__nav--prev"
              onClick={() => step(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button
              type="button"
              className="ws-ldgallery__nav ws-ldgallery__nav--next"
              onClick={() => step(1)}
              aria-label="Next photo"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </>
        )}
      </div>

      </div>

      {/* A native dialog: it brings its own focus trap, Escape and backdrop. */}
      <dialog
        ref={lightbox}
        className="ws-ldlightbox"
        aria-label={`${name}, ${position.toLowerCase()}`}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
      >
        <img src={imageSrc(images[active])} alt={name} />
        <button
          type="button"
          className="ws-ldlightbox__close"
          aria-label="Close full screen photo"
          onClick={() => lightbox.current?.close()}
        >
          <X size={18} aria-hidden />
        </button>
      </dialog>
    </div>
  );
}
