type ListingCardSkeletonProps = {
  showSeller?: boolean;
};

export default function ListingCardSkeleton({ showSeller = false }: ListingCardSkeletonProps) {
  return (
    <div className="ws-pcard ws-pcard--skeleton" aria-hidden>
      <div className="ws-skeleton ws-pcard__media" />
      <div className="ws-pcard__body">
        <div className="ws-pcard__title">
          <div className="ws-skeleton ws-pcard__skel-line" />
          <div className="ws-skeleton ws-pcard__skel-line ws-pcard__skel-line--short" />
        </div>
        <div className="ws-pcard__price">
          <div className="ws-skeleton ws-pcard__skel-price" />
        </div>
        <div className="ws-skeleton ws-pcard__skel-meta" />
        <div className="ws-skeleton ws-pcard__skel-eyebrow" />
      </div>
      <div className="ws-pcard__foot">
        {showSeller && <div className="ws-skeleton ws-pcard__skel-seller" />}
        <div className="ws-skeleton ws-pcard__skel-cta" />
      </div>
    </div>
  );
}
