"use client";

import { AnimatePresence, m } from "motion/react";
import { HeartIcon } from "@ws/components/icons";
import { buttonClass, toast } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { cx } from "@ws/lib/cx";
import { requireAuth } from "@ws/features/auth/session";
import { saveListing, unsaveListing, useIsSaved } from "@ws/features/saved/store";
import { spring } from "@ws/lib/motion/tokens";

/* SaveButton (spec §5.3), eBay's heart over the photo. The DS quiet icon button: 36px to
   the eye, 44px to the finger. It's a toggle, so the name stays "Save {title}" and
   aria-pressed carries the state (WAI-ARIA APG: a toggle's label must not change);
   the title keeps each card's button unique (spec §16.6). Guests sign in first, then
   the save they asked for happens (R-004). */

export function applySave(listingId: string, save: boolean, price_minor?: number) {
  if (!save) {
    unsaveListing(listingId);
    toast({ message: "Removed from your watchlist", action: { label: "Undo", onClick: () => saveListing(listingId, price_minor) } });
    return;
  }
  const result = saveListing(listingId, price_minor);
  if (result === "full") {
    toast({ tone: "warning", message: `Your watchlist is full (${rules.saved.maxListings} listings). Remove one to add this.` });
  } else if (result === "saved") {
    toast({ message: "Added to your watchlist", action: { label: "View", href: "/saved" } });
  }
}

const SPARKS = [0, 60, 120, 180, 240, 300];

/** `price_minor`: the price when saved, so Saved can show a later price drop (B4). */
type Props = { listingId: string; title: string; price_minor?: number; className?: string };

export function SaveButton({ listingId, title, price_minor, className }: Props) {
  const saved = useIsSaved(listingId);
  return (
    <button
      type="button"
      className={buttonClass({ variant: "quiet", size: "sm", icon: true, className: cx("ws-save", className) })}
      aria-label={`Save ${title}`}
      aria-pressed={saved}
      onClick={() => {
        const wanted = !saved; // decided now, so a resumed save after sign-in can't flip it back
        requireAuth("save listings", () => applySave(listingId, wanted, price_minor));
      }}
    >
      {/* Pop on save, settle on remove; a gold ring and sparks burst out when saved. */}
      <m.span className="ws-save__icon" initial={false} animate={saved ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={saved ? { duration: 0.45, times: [0, 0.35, 1] } : spring.snappy}>
        <HeartIcon />
      </m.span>
      <AnimatePresence initial={false}>
        {saved && (
          <m.span key="burst" className="ws-save__burst" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
            <m.span className="ws-save__ring" initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} />
            {SPARKS.map((deg) => (
              <span key={deg} className="ws-save__spoke" style={{ transform: `rotate(${deg}deg)` }}>
                <m.span
                  className="ws-save__spark"
                  initial={{ y: 0, scale: 0.6, opacity: 1 }}
                  animate={{ y: -22, scale: 1, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            ))}
          </m.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** "Add to watchlist" in the buy box (P2P: it takes the cart's place, owner's direction
 *  7 Oct; eBay's "Add to Watchlist" → "Watching"). The visible text changes with the
 *  state, so this is not an aria-pressed toggle (WAI-ARIA APG): the label says it all,
 *  and the toast confirms. Same store as the heart, so both stay in step. */
export function WatchlistButton({ listingId, price_minor }: { listingId: string; price_minor?: number }) {
  const saved = useIsSaved(listingId);
  return (
    <button
      type="button"
      className={buttonClass({ variant: "ghost", block: true, className: cx("ws-watch", saved && "ws-watch--on") })}
      onClick={() => {
        const wanted = !saved;
        requireAuth("save listings", () => applySave(listingId, wanted, price_minor));
      }}
    >
      <HeartIcon weight={saved ? "bold" : undefined} />
      {saved ? "Watching" : "Add to watchlist"}
    </button>
  );
}
