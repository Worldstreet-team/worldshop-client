"use client";

import { HeartIcon } from "@ws/components/icons";
import { buttonClass, toast } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { requireAuth } from "@ws/features/auth/session";
import { saveSearch, unsaveSearch, useSavedSearches } from "./searches";

/* SaveSearchButton (spec §6, eBay "Save this search"): a toggle beside the results
   heading. Guests sign in first (R-004). */
export function SaveSearchButton({ href, label }: { href: string; label: string }) {
  const saved = useSavedSearches().some((s) => s.href === href);
  return (
    <button
      type="button"
      className={buttonClass({ variant: "ghost", size: "sm", className: "ws-savesearch" })}
      aria-pressed={saved}
      onClick={() => {
        const wanted = !saved;
        requireAuth("save searches", () => {
          if (!wanted) {
            unsaveSearch(href);
            toast({ message: "Search removed from Saved", action: { label: "Undo", onClick: () => saveSearch(href, label) } });
          } else if (saveSearch(href, label) === "full") {
            toast({ tone: "warning", message: `Saved searches are full (${rules.saved.maxSearches}). Remove one to save this.` });
          } else {
            toast({ message: "Search saved", action: { label: "View", href: "/saved?tab=searches" } });
          }
        });
      }}
    >
      <HeartIcon />
      Save this search
    </button>
  );
}
