"use client";

import { useParams } from "next/navigation";
import { Morph } from "@ws/components/motion/Morph";
import { Skeleton } from "@ws/components/ui";
import { parseListingParam } from "@ws/lib/data/repo";

/* The listing skeleton's photo box carries the listing's photo name, so the card photo
   morphs into it straight away and on into the real photo when it arrives. */
export function LoadingMedia() {
  const { slug } = useParams<{ slug: string }>();
  const id = parseListingParam(slug ?? "")?.id;
  return (
    <Morph name={id ? `photo-${id}` : undefined}>
      <div className="ws-gallery__strip ws-gallery__skel">
        <Skeleton width="100%" height="100%" radius={0} />
      </div>
    </Morph>
  );
}
