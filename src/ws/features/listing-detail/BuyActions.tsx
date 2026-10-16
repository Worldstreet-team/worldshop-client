"use client";

import Link from "next/link";
import { useState } from "react";
import { ChatDotsIcon, HandshakeAgreementDealIcon, MinusCircleIcon, PlusCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { WatchlistButton } from "@ws/features/listing-card/atoms/SaveButton";
import type { Category } from "@ws/lib/data/types";
import { formatCount } from "@ws/lib/format";

/* QuantityStepper + ActionStack (spec §7), for a P2P marketplace (owner's direction,
   7 Oct): no cart, no checkout. Make offer is the one solid button; the offer opens a
   chat with the seller, and once they agree the seller sends a payment request the
   buyer pays into escrow. Add to watchlist takes the cart's place, then Message seller.
   Vehicles and property have no escrow (PLAN risk 7): Contact seller (and Book a viewing
   for property). Offers and messages are placeholders until Phase 4, so each button
   still lands somewhere that says what it will do (F5). */

type Props = {
  listingId: string;
  title: string;
  price_minor: number;
  available: number;
  sold?: number;
  kind: Category["kind"];
  offers: boolean;
};

export function BuyActions({ listingId, price_minor, available, sold, kind, offers }: Props) {
  const [qty, setQty] = useState(1);
  const withQty = (path: string) => `${path}?listing=${listingId}${qty > 1 ? `&qty=${qty}` : ""}`;

  if (kind !== "goods") {
    return (
      <div className="ws-actions">
        <Link href={`/inbox?listing=${listingId}`} className={buttonClass({ block: true })}>
          <ChatDotsIcon />
          Contact seller
        </Link>
        {kind === "property" && (
          <Link href={`/inbox?listing=${listingId}&about=viewing`} className={buttonClass({ variant: "ghost", block: true })}>
            Book a viewing
          </Link>
        )}
        {offers && (
          <Link href={withQty("/offers")} className={buttonClass({ variant: "quiet", block: true })}>
            <HandshakeAgreementDealIcon />
            Make offer
          </Link>
        )}
        <WatchlistButton listingId={listingId} price_minor={price_minor} />
      </div>
    );
  }

  return (
    <div className="ws-actions">
      {available > 1 && (
        <div className="ws-qty">
          <span className="ws-qty__label" id={`qty-${listingId}`}>
            Quantity
          </span>
          <div className="ws-qty__stepper" role="group" aria-labelledby={`qty-${listingId}`}>
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>
              <MinusCircleIcon />
            </button>
            <output className="ws-qty__n cx-num" aria-live="polite">
              {qty}
            </output>
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="One more" disabled={qty >= available} onClick={() => setQty((q) => q + 1)}>
              <PlusCircleIcon />
            </button>
          </div>
          <span className="ws-qty__stock">
            {formatCount(available)} available{sold ? ` · ${formatCount(sold)} sold` : ""}
          </span>
        </div>
      )}
      <Link href={withQty("/offers")} className={buttonClass({ block: true, className: "ws-actions__buy" })}>
        <HandshakeAgreementDealIcon />
        Make offer
      </Link>
      <WatchlistButton listingId={listingId} price_minor={price_minor} />
      <Link href={`/inbox?listing=${listingId}`} className={buttonClass({ variant: "quiet", block: true })}>
        <ChatDotsIcon />
        Message seller
      </Link>
    </div>
  );
}
