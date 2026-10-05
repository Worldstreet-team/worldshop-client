import { useId, useMemo, useState } from 'react';
import Modal from '@/shared/components/common/Modal';
import type { Listing } from '@/features/stores/api';
import { useListingApi } from '@/features/stores/context/ListingApiContext';
import { dealError, endOfDay, lastDealDay, liveDeal, MAX_DEAL_DAYS, toLocalDate } from '@/features/stores/hooks/useListingEditor';
import { fmtNaira } from '@/features/listings/model';
import { useUIStore } from '@/shared/store/uiStore';

interface BulkDealModalProps {
  listings: Listing[];
  onClose: () => void;
  /** Called once the run is over, whatever its outcome, so the list reloads. */
  onDone: () => void;
}

/**
 * Puts several listings on deal at once. They carry different prices, so the
 * vendor gives a percentage rather than amounts: each listing's price before
 * the deal stays what buyers were paying, and its deal price is cut from that.
 */
export default function BulkDealModal({ listings, onClose, onDone }: BulkDealModalProps) {
  const { api: listingService } = useListingApi();
  const addToast = useUIStore((s) => s.addToast);
  const formId = useId();

  const [percent, setPercent] = useState('10');
  const [endsOn, setEndsOn] = useState(() => toLocalDate(new Date(Date.now() + 7 * 86_400_000)));
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  // A range or "contact for price" has no single price to cut. A listing
  // already on deal is re-priced from its original price, so a second deal
  // replaces the first instead of stacking on top of it.
  const plan = useMemo(() => {
    const pct = Number(percent);
    return listings
      .filter((l) => l.priceType === 'FIXED' && l.basePrice != null)
      .map((l) => {
        const was = liveDeal(l) ? l.compareAtPrice! : l.basePrice!;
        return { listing: l, was, price: Math.round(was * (1 - pct / 100)) };
      });
  }, [listings, percent]);
  const skipped = listings.length - plan.length;
  const anyLive = listings.some(liveDeal);

  const start = async () => {
    const pct = Number(percent);
    if (!Number.isFinite(pct) || pct < 1 || pct > 90) {
      setError('Enter a discount between 1% and 90%.');
      return;
    }
    // Only the date can be wrong here; the prices are derived and always cut.
    const dateProblem = dealError({ priceType: 'FIXED', basePrice: '1', onDeal: true, compareAtPrice: '2', dealEndsOn: endsOn });
    if (dateProblem) {
      setError(dateProblem.message);
      return;
    }

    setRunning(true);
    const dealEndsAt = endOfDay(endsOn).toISOString();
    let failed = 0;
    for (const { listing, was, price } of plan) {
      try {
        await listingService.update(listing.id, { basePrice: price, compareAtPrice: was, dealEndsAt });
      } catch {
        failed += 1;
      }
    }
    setRunning(false);

    const done = plan.length - failed;
    addToast({
      type: failed ? 'error' : 'success',
      message: failed
        ? `${done} of ${plan.length} put on deal. Open the others to see why.`
        : `${done} ${done === 1 ? 'listing' : 'listings'} on deal at ${pct}% off.`,
    });
    onDone();
  };

  const endAll = async () => {
    const live = listings.filter(liveDeal);
    if (!window.confirm(`End the deal on ${live.length} ${live.length === 1 ? 'listing' : 'listings'}? Each stays listed at its deal price.`)) return;
    setRunning(true);
    let failed = 0;
    for (const l of live) {
      try {
        await listingService.update(l.id, { compareAtPrice: null, dealEndsAt: null });
      } catch {
        failed += 1;
      }
    }
    setRunning(false);
    addToast({
      type: failed ? 'error' : 'success',
      message: failed ? `${live.length - failed} of ${live.length} deals ended.` : `${live.length} ${live.length === 1 ? 'deal' : 'deals'} ended.`,
    });
    onDone();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Put ${listings.length} listings on deal`}
      size="md"
      footer={
        <div className="ws-cxsheet__foot">
          {anyLive && (
            <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--danger" onClick={endAll} disabled={running}>
              End deals
            </button>
          )}
          <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost" onClick={onClose} disabled={running}>
            Cancel
          </button>
          <button
            type="button"
            className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary"
            onClick={start}
            disabled={running || plan.length === 0}
          >
            {running ? 'Saving…' : `Start ${plan.length} ${plan.length === 1 ? 'deal' : 'deals'}`}
          </button>
        </div>
      }
    >
      <form
        className="ws-vxwiz__group"
        onSubmit={(ev) => {
          ev.preventDefault();
          void start();
        }}
      >
        {error && <p className="ws-vxerror" role="alert">{error}</p>}

        <div className="ws-vxwiz__two">
          <div className="ws-vxfieldset">
            <label htmlFor={`${formId}-pct`} className="ws-vxlabel">Discount</label>
            <div className="ws-vxmoney">
              <input
                id={`${formId}-pct`}
                type="number"
                min="1"
                max="90"
                inputMode="numeric"
                className="ws-num"
                value={percent}
                onChange={(e) => { setPercent(e.target.value); setError(''); }}
                autoFocus
              />
              <span aria-hidden>%</span>
            </div>
          </div>
          <div className="ws-vxfieldset">
            <label htmlFor={`${formId}-ends`} className="ws-vxlabel">Deal ends</label>
            <input
              id={`${formId}-ends`}
              type="date"
              className="ws-vxinput"
              min={toLocalDate(new Date())}
              max={lastDealDay()}
              value={endsOn}
              onChange={(e) => { setEndsOn(e.target.value); setError(''); }}
            />
          </div>
        </div>
        <span className="ws-vxhint">
          Runs to the end of that day, for up to {MAX_DEAL_DAYS} days. A listing already on deal is re-priced from its
          original price, not cut again.
        </span>

        <ul className="ws-vxdeallist">
          {plan.map(({ listing, was, price }) => (
            <li key={listing.id}>
              <span className="ws-vxdeallist__name">{listing.name}</span>
              <span className="ws-num">
                <s>{fmtNaira(was)}</s> {Number(percent) > 0 && Number(percent) < 100 ? fmtNaira(price) : '—'}
              </span>
            </li>
          ))}
        </ul>
        {skipped > 0 && (
          <span className="ws-vxhint">
            {skipped} {skipped === 1 ? 'listing is' : 'listings are'} skipped: only a fixed price can go on deal.
          </span>
        )}
      </form>
    </Modal>
  );
}
