"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { ListingMedia } from "@ws/lib/data/types";
import { photoRing } from "./scenes/photo-ring";
import { ThreeStage } from "./ThreeStage";

/* Listing 3D viewer (owner's pick, 6 Oct; lands in the Phase 3 gallery): drag to spin
   the photos on a ring. Without 3D it's the first photo. The live region names the
   photo facing the buyer; the flat gallery remains the keyboard route. */
export function PhotoViewer3D({ media }: { media: readonly ListingMedia[] }) {
  const [front, setFront] = useState(0);
  const urls = media.map((m) => m.url);
  const key = urls.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the photos change
  const load = useCallback(async () => photoRing(urls, setFront), [key]);
  const first = media[0];
  if (!first) return null;

  return (
    <figure className="ws-viewer3d">
      <ThreeStage
        key={key}
        load={load}
        draggable
        fallback={<Image src={first.url} alt={first.alt} fill sizes="(min-width: 768px) 50vw, 100vw" />}
      />
      <figcaption className="ws-viewer3d__caption" aria-live="polite">
        Photo {front + 1} of {media.length}
        <span className="cx-muted"> · drag to turn</span>
      </figcaption>
    </figure>
  );
}
