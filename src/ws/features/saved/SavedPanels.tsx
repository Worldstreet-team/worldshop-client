"use client";

import Link from "next/link";
import { HeartIcon, MagnifyingGlassIcon, StoreIcon, TrashIcon } from "@ws/components/icons";
import { EmptyState, buttonClass } from "@ws/components/ui";
import { ListingCard, ListingCardSkeleton } from "@ws/features/listing-card/ListingCard";
import { plural, timeAgo } from "@ws/lib/format";
import { formatCurrency, kobo } from "@ws/lib/money";
import { unsaveSearch, useSavedSearches } from "./searches";
import { unsaveListing, useSavedEntries } from "./store";
import { useListings } from "./useListings";
import { useState } from "react";
import { toast } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { setItemAlert, setSearchAlert } from "@ws/features/alerts/model";
import { updateAlerts, useAlerts } from "@ws/features/alerts/store";
import { searchTotal } from "@ws/features/alerts/AlertsWatcher";
import type { ListingWithSeller } from "@ws/lib/data/types";

/* The Saved tabs (flows B4 step 3, SCR-006). Each item shows its current price with a
   "Price dropped ₦X" tag when it's cheaper than when saved; sold and ended listings
   stay, marked (R-026); removed ones say so and can be cleared (EC-006). */

export function SavedListings() {
  const entries = useSavedEntries();
  const listings = useListings(entries.map((e) => e.id));

  if (entries.length === 0) {
    return (
      <EmptyState icon={<HeartIcon />} title="Nothing saved yet" action={<Link href="/" className={buttonClass({ variant: "ghost" })}>Start browsing</Link>}>
        Tap the heart on any listing to keep it here and see when its price drops.
      </EmptyState>
    );
  }
  if (listings === null) {
    return (
      <ul className="ws-card-grid ws-saved" aria-label="Saved listings" aria-busy="true">
        {entries.slice(0, 4).map((e) => (
          <li key={e.id}>
            <ListingCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <p className="ws-saved__count">{plural(entries.length, "saved listing")}</p>
      <ul className="ws-card-grid ws-saved" aria-label="Saved listings">
        {entries.map((e) => {
          const l = listings.find((x) => x.id === e.id);
          if (!l) {
            return (
              <li key={e.id} className="ws-saved__gone">
                <p>This listing was removed by the seller.</p>
                <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => unsaveListing(e.id)}>
                  <TrashIcon />
                  Remove from Saved
                </button>
              </li>
            );
          }
          const ended = l.status === "sold" ? "Sold" : l.status === "ended" ? "Ended" : l.status === "paused" ? "Paused by the seller" : null;
          const drop = e.price_minor !== undefined && e.price_minor > l.price_minor ? e.price_minor - l.price_minor : 0;
          return (
            <li key={e.id} className="ws-saved__item" data-ended={ended ? "" : undefined}>
              {(ended || drop > 0) && (
                <p className={ended ? "ws-saved__tag" : "ws-saved__tag ws-saved__tag--drop"}>{ended ?? `Price dropped ${formatCurrency(kobo(drop))}`}</p>
              )}
              <ListingCard listing={l} />
              {rules.flags.alerts && l.status !== "sold" && l.status !== "ended" && <ItemAlerts listing={l} />}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function SavedSearches() {
  const searches = useSavedSearches();
  if (searches.length === 0) {
    return (
      <EmptyState icon={<MagnifyingGlassIcon />} title="No saved searches" action={<Link href="/search" className={buttonClass({ variant: "ghost" })}>Search</Link>}>
        Use “Save this search” on any results page to come back to it in one tap.
      </EmptyState>
    );
  }
  return (
    <>
      <p className="ws-saved__count">{plural(searches.length, "saved search", "saved searches")}</p>
      <ul className="ws-saved-searches" aria-label="Saved searches">
        {searches.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="ws-saved-searches__link">
              <MagnifyingGlassIcon />
              <span>
                <span className="ws-saved-searches__label">{s.label}</span>
                <span className="ws-saved-searches__at">Saved {timeAgo(s.at).long}</span>
              </span>
            </Link>
            {rules.flags.alerts && <SearchAlertToggle href={s.href} label={s.label} />}
            <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label={`Remove saved search ${s.label}`} onClick={() => { unsaveSearch(s.href); updateAlerts((a) => setSearchAlert(a, s.href, s.label, false, 0)); }}>
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function SavedSellers() {
  return (
    <EmptyState icon={<StoreIcon />} title="No sellers saved yet">
      Following a seller comes with shop pages, in Phase 3 of the build. You&apos;ll see their new listings here.
    </EmptyState>
  );
}


/** Opt-in alerts on a saved listing (B4 step 4): price drop while it's live, back in stock while it isn't. */
function ItemAlerts({ listing }: { listing: ListingWithSeller }) {
  const alert = useAlerts().items.find((a) => a.id === listing.id);
  const kind = listing.status === "live" ? "price_drop" : "back_in_stock";
  const on = alert?.[kind] ?? false;
  return (
    <label className="ws-alert-toggle">
      <input type="checkbox" role="switch" checked={on} onChange={(e) => updateAlerts((a) => setItemAlert(a, { id: listing.id, price_minor: listing.price_minor, status: listing.status }, kind, e.target.checked))} />
      {kind === "price_drop" ? "Alert me if the price drops" : "Alert me when it’s back"}
    </label>
  );
}

function SearchAlertToggle({ href, label }: { href: string; label: string }) {
  const on = useAlerts().searches.some((s) => s.href === href);
  const [busy, setBusy] = useState(false);
  const toggle = async (next: boolean) => {
    if (!next) return updateAlerts((a) => setSearchAlert(a, href, label, false, 0));
    setBusy(true);
    try { const total = await searchTotal(href); updateAlerts((a) => setSearchAlert(a, href, label, true, total)); }
    catch { toast({ message: "Couldn’t turn on the alert. Check your connection and try again." }); }
    finally { setBusy(false); }
  };
  return (
    <label className="ws-alert-toggle">
      <input type="checkbox" role="switch" checked={on} disabled={busy} onChange={(e) => void toggle(e.target.checked)} />
      <span>New matches<span className="cx-sr-only"> for {label}</span></span>
    </label>
  );
}
