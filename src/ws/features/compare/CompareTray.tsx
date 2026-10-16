"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { useListings } from "@ws/features/saved/useListings";
import { clearCompare, compareHref, toggleCompare, useCompare } from "./store";

/** CompareTray (spec §270): sticky above the bottom nav while anything is picked. */
export function CompareTray() {
  const ids = useCompare();
  const path = usePathname();
  const listings = useListings(ids);
  if (!rules.flags.compare || ids.length === 0 || path === "/compare") return null;
  return <aside className="ws-compare-tray" aria-label="Compare">
    <ul>{ids.map((id) => {
      const l = listings?.find((x) => x.id === id);
      return <li key={id}>
        
        {l?.media[0] ? <img src={l.media[0].url} alt="" width={40} height={40} /> : <span className="ws-compare-tray__ph" />}
        <span className="cx-sr-only">{l?.title ?? id}</span>
        <button type="button" aria-label={`Remove ${l?.title ?? "item"} from compare`} onClick={() => toggleCompare(id)}><XmarkCircleIcon /></button>
      </li>;
    })}</ul>
    <p>{ids.length} of {rules.compare.max}</p>
    <Link className={buttonClass({ size: "sm" })} href={compareHref(ids)} aria-disabled={ids.length < 2 || undefined} onClick={(e) => { if (ids.length < 2) e.preventDefault(); }}>{ids.length < 2 ? "Pick one more" : "Compare"}</Link>
    <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} onClick={clearCompare}>Clear</button>
  </aside>;
}
