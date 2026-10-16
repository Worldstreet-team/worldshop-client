import { rules } from "@ws/config/marketplace-rules";
import type { ListingRevision } from "@ws/lib/data/types";
import { formatCurrency, kobo } from "@ws/lib/money";

/*
 * PriceHistorySparkline (spec §320): the price over the last 30 days, drawn from the
 * public revision log (R-112), so a crossed-out "was" price can be checked against what
 * the item actually cost. Nothing renders when the price hasn't changed in the window.
 */

const DAY = 86_400_000;
const day = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: rules.time.zone });

/** Step points [time, price] from the window start to now. */
export function priceSeries(price_minor: number, created_at: string, revisions: readonly ListingRevision[] | undefined, now: number) {
  const changes = (revisions ?? []).flatMap((r) => r.change === "price" ? [{ at: Date.parse(r.at), from: r.from_minor as number, to: r.to_minor as number }] : []).sort((a, b) => a.at - b.at);
  const start = Math.max(Date.parse(created_at), now - rules.priceHistory.days * DAY);
  const inWindow = changes.filter((c) => c.at >= start && c.at <= now);
  if (!inWindow.length) return null;
  const before = changes.filter((c) => c.at < start).at(-1);
  const first = before ? before.to : inWindow[0].from;
  return [[start, first], ...inWindow.map((c) => [c.at, c.to]), [now, price_minor]] as [number, number][];
}

export function PriceHistory({ price_minor, created_at, revisions, now }: { price_minor: number; created_at: string; revisions?: readonly ListingRevision[]; now: number }) {
  const points = priceSeries(price_minor, created_at, revisions, now);
  if (!points) return null;
  const prices = points.map(([, p]) => p);
  const [lo, hi] = [Math.min(...prices), Math.max(...prices)];
  const [t0, t1] = [points[0][0], points.at(-1)![0]];
  const x = (t: number) => 2 + (t - t0) / Math.max(1, t1 - t0) * 116;
  const y = (p: number) => hi === lo ? 16 : 28 - (p - lo) / (hi - lo) * 24;
  const path = points.map(([t, p], i) => i ? `H${x(t).toFixed(1)}V${y(p).toFixed(1)}` : `M${x(t).toFixed(1)} ${y(p).toFixed(1)}`).join("");
  const last = points.at(-2)!;
  const changed = points.length - 2;
  return (
    <div className="ws-pricehistory">
      <svg viewBox="0 0 120 32" aria-hidden="true" focusable="false"><path d={path} /></svg>
      <p>
        <strong>Price history, {rules.priceHistory.days} days</strong>
        <span>{changed === 1 ? `${last[1] < points[0][1] ? "Lowered" : "Raised"} from ${formatCurrency(kobo(points[0][1]))} on ${day.format(last[0])}` : `${changed} changes`} · lowest {formatCurrency(kobo(lo))}</span>
      </p>
    </div>
  );
}
