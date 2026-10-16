import Link from "next/link";
import { ArrowReturnIcon, CheckShieldIcon, EyeIcon, InfoCircleIcon } from "@ws/components/icons";
import { rules } from "@ws/config/marketplace-rules";
import { ESCROW, escrowLine } from "@ws/lib/copy/escrow";
import type { ListingWithSeller } from "@ws/lib/data/types";
import { plural } from "@ws/lib/format";

/* DemandLine and ReassuranceLine (spec §7). Real counts only (PLAN F7): watchers show
   only past the threshold and when the seller allows it (R-025, PLAN C7). */

export function DemandLine({ listing }: { listing: ListingWithSeller }) {
  const parts: string[] = [];
  if (listing.seller.show_watchers && (listing.watchers ?? 0) > rules.demand.watchersThreshold) parts.push(`${plural(listing.watchers!, "person", "people")} watching`);
  if ((listing.sold_count ?? 0) > 0) parts.push(`${plural(listing.sold_count!, "sold", "sold")}`);
  if (parts.length === 0) return null;
  return (
    <p className="ws-demand">
      <EyeIcon />
      <span>
        <strong>People want this.</strong> {parts.join(" · ").replace(/^./, (c) => c.toUpperCase())}.
      </span>
    </p>
  );
}

export function ReassuranceLine({ listing }: { listing: ListingWithSeller }) {
  const goods = listing.category.kind === "goods";
  return (
    <ul className="ws-reassure">
      {goods && (
        <li>
          <ArrowReturnIcon />
          {listing.return_days ? `${listing.return_days}-day returns.` : ESCROW.noReturns}
        </li>
      )}
      <li data-covered={goods || undefined}>
        {goods ? <CheckShieldIcon /> : <InfoCircleIcon />}
        {/* Short form here; the full claim is in the protection panel below. */}
        <span>
          {goods ? ESCROW.strip : escrowLine(listing.category)}{" "}
          {goods && (
            <Link href={ESCROW.learnMoreHref} className="ws-reassure__link">
              How escrow works
            </Link>
          )}
        </span>
      </li>
    </ul>
  );
}
