import { useState } from "react";
import { ChevronRight, ImageOff } from "lucide-react";
import { imageSrc, type ImageRef } from "@/features/listings/model";

type ListingGalleryProps = {
  images: ImageRef[];
  name: string;
};

export default function ListingGallery({ images, name }: ListingGalleryProps) {
  const [active, setActive] = useState(0);

  const step = (delta: number) => {
    if (images.length < 2) return;
    setActive((i) => (i + delta + images.length) % images.length);
  };

  return (
    <div
      className={`ws-gallery${images.length > 1 ? " ws-gallery--strip" : ""}`}
    >
      {images.length > 1 && (
        <div className="ws-gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              className={`ws-thumb${i === active ? " is-active" : ""}`}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
            >
              <img src={imageSrc(img)} alt="" />
            </button>
          ))}
        </div>
      )}

      <div
        className="ws-gallery__main"
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos of ${name}`}
        tabIndex={images.length > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        {images.length > 0 ? (
          <>
            <img
              className="ws-gallery__back"
              src={imageSrc(images[active])}
              alt=""
              aria-hidden
            />
            <img
              className="ws-gallery__photo"
              src={imageSrc(images[active])}
              alt={name}
            />
          </>
        ) : (
          <div className="ws-pcard__noimg">
            <ImageOff size={24} aria-hidden />
            No photos
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="ws-gallery__nav is-prev"
              onClick={() => step(-1)}
              aria-label="Previous photo"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="ws-gallery__nav is-next"
              onClick={() => step(1)}
              aria-label="Next photo"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
            <span className="ws-gallery__count ws-num" aria-live="polite">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
