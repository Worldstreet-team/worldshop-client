"use client";

import { AnimatePresence, m } from "motion/react";
import { type ReactNode } from "react";
import { DotsVerticalIcon, GridIcon, StoreIcon, XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass, Menu, toast } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { toggleCompare, useCompare } from "@ws/features/compare/store";
import { hiddenThisVisit, hideListing, hideSeller, unhide, useHidden } from "@ws/features/hidden/store";
import { spring } from "@ws/lib/motion/tokens";

/* The card's overflow menu (spec §5.1 item 10) and the gate that removes hidden cards.
   eBay's card menu offers hiding; "Find similar" and "Report" join when their pages
   exist (S0.9, Phase 3), so the menu never holds a dead end (audit F5). */

type Target = { listingId: string; title: string; sellerId: string; shopName: string };

export function CardMenu({ listingId, title, sellerId, shopName }: Target) {
  const compared = useCompare();
  const inCompare = compared.includes(listingId);
  const compare = () => {
    const result = toggleCompare(listingId);
    if (result === "full") toast({ message: `You can compare up to ${rules.compare.max} items. Remove one first.` });
  };
  return (
    <Menu
      label={`More actions for ${title}`}
      trigger={<DotsVerticalIcon />}
      items={[
        { label: "Not interested", icon: <XmarkCircleIcon />, onSelect: () => hideListing(listingId) },
        { label: `Hide ${shopName}`, icon: <StoreIcon />, onSelect: () => hideSeller(sellerId, listingId) },
        ...(rules.flags.compare ? [{ label: inCompare ? "Remove from compare" : "Add to compare", icon: <GridIcon />, onSelect: compare }] : []),
      ]}
    />
  );
}

/** A stable callback ref, so it runs once on mount, not on every render. */
function focusOnMount(el: HTMLElement | null) {
  el?.focus();
}

/**
 * Renders the card unless it's hidden. Something hidden just now leaves a short note
 * with Undo in its place, and focus moves to Undo so keyboard users aren't dropped;
 * things hidden on an earlier visit simply don't render.
 */
export function HideGate({ listingId, sellerId, shopName, children }: Omit<Target, "title"> & { children: ReactNode }) {
  const hidden = useHidden();
  const kind = hidden.listings.includes(listingId) ? "listing" : hidden.sellers.includes(sellerId) ? "seller" : null;
  const recent = hiddenThisVisit();
  const justNow = kind !== null && recent?.kind === kind && recent.from === listingId;

  // The card shrinks away (the note mounts after, mode="wait", so Undo takes focus on mount) and the note springs in; Undo brings the card back.
  return (
    <AnimatePresence initial={false} mode="wait">
      {kind === null ? (
        <m.div key="card" className="ws-hide-wrap" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }} transition={spring.soft}>
          {children}
        </m.div>
      ) : justNow ? (
        <m.div key="note" className="cx-card ws-card-hidden" role="status" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft}>
          <p>{kind === "listing" ? "Hidden. You won't see this listing again." : `Hidden. You won't see listings from ${shopName}.`}</p>
          <button ref={focusOnMount} type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => unhide(kind, kind === "listing" ? listingId : sellerId)}>
            Undo
          </button>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
