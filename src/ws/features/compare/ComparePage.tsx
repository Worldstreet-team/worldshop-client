import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { conditionLabel } from "@ws/features/listing-card/atoms";
import { listingPath, type ListingWithSeller } from "@ws/lib/data";
import { formatDayRange } from "@ws/lib/format";
import { formatCurrency } from "@ws/lib/money";
import { compareHref } from "./href";
import { ClearCompare } from "./ClearCompare";

/* The comparison itself: one column per listing, one row per fact, so differences line
   up. Specifics are the union across items; a blank cell means the seller didn't say. */
export function ComparePage({ listings }: { listings: ListingWithSeller[] }) {
  if (listings.length < 2) return <section className="ws-order-empty"><h1>Compare listings</h1><p>Pick 2 to 4 listings with “Add to compare” in a card’s menu.</p><Link className={buttonClass({ variant: "ghost" })} href="/search">Browse listings</Link></section>;
  const keys = [...new Set(listings.flatMap((l) => l.attributes.map((a) => a.key)))];
  const cheapest = Math.min(...listings.map((l) => l.price_minor));
  const rows: [string, (l: ListingWithSeller) => React.ReactNode][] = [
    ["Price", (l) => <strong data-best={l.price_minor === cheapest || undefined}>{formatCurrency(l.price_minor)}</strong>],
    ["Condition", (l) => conditionLabel(l.condition)],
    ["Delivery", (l) => l.delivery.length ? l.delivery.map((d) => `${d.fee_minor ? formatCurrency(d.fee_minor) : "Free"} · ${formatDayRange(d.eta_days)}`).join(", ") : "Collection only"],
    ["Location", (l) => `${l.location.area}, ${l.location.city}`],
    ["Returns", (l) => l.return_days ? `${l.return_days} days` : "No returns"],
    ["Offers", (l) => l.offers_enabled ? "Accepts offers" : "Fixed price"],
    ["Seller", (l) => `${l.seller.shop_name}${l.seller.verified ? " · verified" : ""}`],
    ["Seller feedback", (l) => l.seller.feedback.count ? `${l.seller.feedback.positive_percent}% positive (${l.seller.feedback.count})` : "New seller"],
    ...keys.map((key): [string, (l: ListingWithSeller) => React.ReactNode] => [key, (l) => l.attributes.find((a) => a.key === key)?.value ?? "—"]),
  ];
  const ids = listings.map((l) => l.id);
  return <div className="ws-compare">
    <header className="ws-flow__head"><div><p className="ws-sell-eyebrow">Compare</p><h1>Compare {listings.length} listings</h1></div><ClearCompare /></header>
    <div className="ws-compare__scroll" role="region" aria-label="Comparison table" tabIndex={0}>
      <table className="ws-compare__table">
        <thead><tr><td />{listings.map((l) => <th key={l.id} scope="col">
          {l.media[0] && <Image src={l.media[0].url} alt="" width={120} height={120} />}
          <Link href={listingPath(l)}>{l.title}</Link>
          {listings.length > 2 && <Link className="ws-compare__remove" href={compareHref(ids.filter((x) => x !== l.id))}>Remove</Link>}
        </th>)}</tr></thead>
        <tbody>{rows.map(([label, cell]) => <tr key={label}><th scope="row">{label}</th>{listings.map((l) => <td key={l.id}>{cell(l)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <Link className={buttonClass({ variant: "quiet" })} href="/search"><ArrowLeftIcon />Keep browsing</Link>
  </div>;
}
