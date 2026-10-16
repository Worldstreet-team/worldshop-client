import { Skeleton } from "@ws/components/ui";
import { LoadingMedia } from "@ws/features/listing-card/LoadingMedia";

/* Shown at once when a card is tapped, so the tap registers on a slow network. The same
   grid as the listing page (gallery, then title and buy box), so nothing jumps. */
export default function ListingLoading() {
  return (
    <div className="ws-listing" role="status" aria-busy="true" aria-label="Loading listing">
      <Skeleton width={160} height={20} />
      <div className="ws-listing__top">
        <div className="ws-gallery">
          <div className="ws-gallery__thumbs" />
          <div className="ws-gallery__main">
            <LoadingMedia />
          </div>
        </div>
        <div className="ws-listing__side">
          <Skeleton width="85%" height={30} />
          <Skeleton width="55%" height={18} />
          <Skeleton width="40%" height={36} />
          <Skeleton width="65%" height={16} />
          <Skeleton width="100%" height={48} radius="var(--cx-r-pill)" />
        </div>
      </div>
    </div>
  );
}
