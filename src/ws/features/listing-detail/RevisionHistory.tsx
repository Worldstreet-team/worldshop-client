"use client";

import { useRef } from "react";
import { XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import type { ListingRevision } from "@ws/lib/data/types";
import { formatCurrency } from "@ws/lib/money";

/* RevisionHistoryLink + RevisionModal (spec §7; flows B3 step 5, R-112; eBay "Last
   updated … View all revisions"). Edits to a live listing are public, which cuts down
   bait-and-switch disputes. Newest first, ending with when it was listed. A native
   modal dialog: Escape closes it and focus returns to the button. */

const ID = "revision-history";
const when = new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: rules.time.zone });

function describe(r: ListingRevision) {
  switch (r.change) {
    case "price":
      return `Price ${r.to_minor < r.from_minor ? "lowered" : "raised"} from ${formatCurrency(r.from_minor)} to ${formatCurrency(r.to_minor)}`;
    case "description":
      return "Description edited";
    case "photos":
      return "Photos changed";
    case "quantity":
      return "Quantity changed";
  }
}

export function RevisionHistory({ revisions, listedAt }: { revisions: readonly ListingRevision[]; listedAt: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  const rows = [...revisions].reverse();
  return (
    <>
      <button type="button" className="ws-linkbtn" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        View history ({revisions.length})
      </button>
      <dialog ref={dialog} id={ID} className="ws-modal" aria-labelledby={`${ID}-title`} onClick={(e) => e.target === e.currentTarget && close()}>
        <div className="ws-modal__panel">
          <div className="ws-modal__head">
            <h2 id={`${ID}-title`} className="ws-modal__title">
              Revision history
            </h2>
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Close" onClick={close}>
              <XmarkCircleIcon />
            </button>
          </div>
          <p className="cx-small">Changes the seller made after listing. Every edit to a live listing is shown here.</p>
          <ol className="ws-revisions">
            {rows.map((r) => (
              <li key={r.at + r.change}>
                <time dateTime={r.at}>{when.format(new Date(r.at))}</time>
                <span>{describe(r)}</span>
              </li>
            ))}
            <li>
              <time dateTime={listedAt}>{when.format(new Date(listedAt))}</time>
              <span>Listed</span>
            </li>
          </ol>
        </div>
      </dialog>
    </>
  );
}

/** SellerNotes (spec §7, eBay "Seller notes"): the seller's own words, quoted. */
export function SellerNotes({ notes, shopName }: { notes: string; shopName: string }) {
  return (
    <figure className="ws-notes">
      <figcaption className="ws-subtitle">Seller notes</figcaption>
      <blockquote>
        <p>{notes}</p>
      </blockquote>
      <p className="ws-notes__by">From {shopName}</p>
    </figure>
  );
}
