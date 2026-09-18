type ListingCardSkeletonProps = {
  showSeller?: boolean;
};

export default function ListingCardSkeleton({ showSeller = false }: ListingCardSkeletonProps) {
  return (
    <div className="ws-pcard ws-pcard--skeleton" aria-hidden>
      <div className="ws-skeleton ws-pcard__media" />
      <div className="ws-pcard__body">
        <div className="ws-skeleton ws-pcard__skel-price" />
        <div className="ws-skeleton ws-pcard__skel-title" />
        <div className="ws-skeleton ws-pcard__skel-meta" />
        {showSeller && <div className="ws-skeleton ws-pcard__skel-seller" />}
      </div>
    </div>
  );
}
