import Link from "next/link";
import { ClockIcon, InfoCircleIcon, StoreIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { SaveButton } from "@ws/features/listing-card/atoms/SaveButton";
import type { Availability } from "@ws/lib/availability";
import { UNAVAILABLE } from "@ws/lib/copy/listing";

/* UnavailableState (spec §7; flows R-021, R-032): in place of the buying actions when a
   listing has sold, ended, run out of stock or is held by another buyer's accepted
   offer. The page stays, so shared links still work; the next step is similar items or
   the seller's shop. Out of stock and reserved listings can still be saved. */

type Props = {
  availability: Exclude<Availability, "available" | "gone">;
  listingId: string;
  title: string;
  price_minor: number;
  similarHref: string;
  shopHref: string;
  messageHref: string;
};

export function UnavailableState({ availability, listingId, title, price_minor, similarHref, shopHref, messageHref }: Props) {
  const copy = UNAVAILABLE[availability];
  const canSave = availability === "paused" || availability === "reserved";
  return (
    <div className="ws-unavailable" role="note" aria-labelledby="unavailable-title" data-availability={availability}>
      <p id="unavailable-title" className="ws-unavailable__title">
        {availability === "reserved" ? <ClockIcon /> : <InfoCircleIcon />}
        {copy.title}
      </p>
      <p className="ws-unavailable__body">{copy.body}</p>
      <div className="ws-unavailable__actions">
        {availability === "reserved" ? (
          <Link href={messageHref} className={buttonClass({ variant: "ghost", block: true })}>
            Message seller
          </Link>
        ) : (
          <Link href={similarHref} className={buttonClass({ variant: "ghost", block: true })}>
            See similar items
          </Link>
        )}
        <Link href={shopHref} className={buttonClass({ variant: "quiet", block: true })}>
          <StoreIcon />
          Visit shop
        </Link>
        {canSave && <SaveButton listingId={listingId} title={title} price_minor={price_minor} />}
      </div>
    </div>
  );
}
