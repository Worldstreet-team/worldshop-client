
export default function StoreCardSkeleton() {
  return (
    <div className="ws-storecard ws-storecard--skeleton" aria-hidden>
      <div className="ws-storecard__banner ws-skeleton" />
      <div className="ws-storecard__body">
        <div className="ws-storecard__head">
          <span className="ws-storecard__logo ws-skeleton" />
        </div>
        <span className="ws-skeleton ws-storecard__skel" style={{ height: 16, width: '58%' }} />
        <span className="ws-skeleton ws-storecard__skel" style={{ height: 12, width: '36%', marginTop: 8 }} />
        <div className="ws-storecard__desc">
          <span className="ws-skeleton ws-storecard__skel" style={{ height: 12, width: '94%' }} />
          <span className="ws-skeleton ws-storecard__skel" style={{ height: 12, width: '70%', marginTop: 6 }} />
        </div>
        <div className="ws-storecard__stats ws-skeleton" />
      </div>
      <div className="ws-storecard__foot">
        <span className="ws-skeleton ws-storecard__skel" style={{ height: 12, width: 84 }} />
      </div>
    </div>
  );
}
