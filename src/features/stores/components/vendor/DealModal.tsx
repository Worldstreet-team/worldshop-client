import { useId, useState } from 'react';
import Modal from '@/shared/components/common/Modal';
import type { Listing } from '@/features/stores/api';
import { useListingApi } from '@/features/stores/context/ListingApiContext';
import { dealError, lastDealDay, liveDeal, MAX_DEAL_DAYS, toLocalDate, endOfDay } from '@/features/stores/hooks/useListingEditor';
import { fmtNaira } from '@/features/listings/model';
import { toApiError } from '@/shared/lib/api';
import { useUIStore } from '@/shared/store/uiStore';

interface DealModalProps {
  listing: Listing;
  onClose: () => void;
  /** Called after a save or an end, so the list can reload. */
  onSaved: () => void;
}

/**
 * Sets, changes or ends a deal straight from the products list, without the
 * four-step editor. It sends only the price and the two deal fields; the
 * server checks them against the rest of the listing as stored.
 */
export default function DealModal({ listing, onClose, onSaved }: DealModalProps) {
  const { api: listingService } = useListingApi();
  const addToast = useUIStore((s) => s.addToast);
  const formId = useId();
  const live = liveDeal(listing);

  const [price, setPrice] = useState(listing.basePrice != null ? String(listing.basePrice) : '');
  // A new deal starts from the current price as the "before" price, which is
  // the usual case: the vendor is cutting what they charge today.
  const [was, setWas] = useState(
    live ? String(listing.compareAtPrice) : listing.basePrice != null ? String(listing.basePrice) : '',
  );
  const [endsOn, setEndsOn] = useState(
    live ? toLocalDate(new Date(listing.dealEndsAt!)) : toLocalDate(new Date(Date.now() + 7 * 86_400_000)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (price === '' || Number(price) <= 0) e.basePrice = 'Enter the deal price.';
    const deal = dealError({ priceType: 'FIXED', basePrice: price, onDeal: true, compareAtPrice: was, dealEndsOn: endsOn });
    if (deal) e[deal.field] = deal.message;
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setSaving(true);
    try {
      await listingService.update(listing.id, {
        basePrice: Number(price),
        compareAtPrice: Number(was),
        dealEndsAt: endOfDay(endsOn).toISOString(),
      });
      addToast({ type: 'success', message: live ? 'Deal updated' : 'Listing is on deal' });
      onSaved();
    } catch (err: unknown) {
      setErrors({ form: toApiError(err, 'Could not save this deal').message });
    } finally {
      setSaving(false);
    }
  };

  const end = async () => {
    if (!window.confirm(`End the deal on "${listing.name}"? It stays listed at ${fmtNaira(listing.basePrice ?? 0)}.`)) return;
    setSaving(true);
    try {
      await listingService.update(listing.id, { compareAtPrice: null, dealEndsAt: null });
      addToast({ type: 'success', message: 'Deal ended' });
      onSaved();
    } catch (err: unknown) {
      setErrors({ form: toApiError(err, 'Could not end this deal').message });
    } finally {
      setSaving(false);
    }
  };

  const cut = Number(was) - Number(price);
  const showSaving = price !== '' && was !== '' && cut > 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={live ? 'Edit deal' : 'Put on deal'}
      size="sm"
      footer={
        <div className="ws-cxsheet__foot">
          {live && (
            <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--danger" onClick={end} disabled={saving}>
              End deal
            </button>
          )}
          <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="ws-ldbtn ws-ldbtn--sm ws-ldbtn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : live ? 'Save deal' : 'Start deal'}
          </button>
        </div>
      }
    >
      <form
        className="ws-vxwiz__group"
        onSubmit={(ev) => {
          ev.preventDefault();
          void save();
        }}
      >
        <p className="ws-vxhint" style={{ marginTop: 0 }}>
          <strong>{listing.name}</strong>. Deals show in the home page's Deals section, soonest ending first, for up
          to {MAX_DEAL_DAYS} days.
        </p>

        {errors.form && <p className="ws-vxerror" role="alert">{errors.form}</p>}

        <div className="ws-vxfieldset">
          <label htmlFor={`${formId}-was`} className="ws-vxlabel">Price before the deal</label>
          <div className={`ws-vxmoney${errors.compareAtPrice ? ' is-bad' : ''}`}>
            <span aria-hidden>₦</span>
            <input
              id={`${formId}-was`}
              type="number"
              min="0"
              inputMode="numeric"
              className="ws-num"
              value={was}
              aria-invalid={!!errors.compareAtPrice}
              onChange={(e) => { setWas(e.target.value); setErrors({}); }}
            />
          </div>
          {errors.compareAtPrice && <p className="ws-vxerror" role="alert">{errors.compareAtPrice}</p>}
        </div>

        <div className="ws-vxfieldset">
          <label htmlFor={`${formId}-price`} className="ws-vxlabel">Deal price</label>
          <div className={`ws-vxmoney${errors.basePrice ? ' is-bad' : ''}`}>
            <span aria-hidden>₦</span>
            <input
              id={`${formId}-price`}
              type="number"
              min="0"
              inputMode="numeric"
              className="ws-num"
              value={price}
              aria-invalid={!!errors.basePrice}
              onChange={(e) => { setPrice(e.target.value); setErrors({}); }}
              autoFocus
            />
          </div>
          {errors.basePrice && <p className="ws-vxerror" role="alert">{errors.basePrice}</p>}
          {showSaving && (
            <span className="ws-vxhint ws-num">
              {Math.round((cut / Number(was)) * 100)}% off, buyers save {fmtNaira(cut)}
            </span>
          )}
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
            aria-invalid={!!errors.dealEndsOn}
            onChange={(e) => { setEndsOn(e.target.value); setErrors({}); }}
          />
          {errors.dealEndsOn && <p className="ws-vxerror" role="alert">{errors.dealEndsOn}</p>}
          <span className="ws-vxhint">Runs to the end of that day.</span>
        </div>
      </form>
    </Modal>
  );
}
