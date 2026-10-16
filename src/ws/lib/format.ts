/* Plain-language formatters shared by card atoms. Money is not here: use formatCurrency(). */

const grouped = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/** Grouped integer: 1284 → "1,284". */
export function formatCount(n: number) {
  return grouped.format(n);
}

/** "1 watcher", "22 watchers", "64 sold" (pass the same word twice for invariant nouns). */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** Distance from the buyer's anchor: "Under 1 km", "4.2 km", "12 km", "528 km". */
export function formatDistance(km: number) {
  if (km < 1) return "Under 1 km";
  const tenths = Math.round(km * 10) / 10;
  if (tenths < 10) return `${oneDecimal.format(tenths)} km`;
  return `${formatCount(Math.round(km))} km`;
}

type Ago = { short: string; long: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Age of a timestamp, as a short form for the eye ("3d ago") and a long form for
 * screen readers ("3 days ago"). Future times (clock skew) read as "just now".
 */
export function timeAgo(iso: string, now: number = Date.now()): Ago {
  const age = Math.max(0, now - Date.parse(iso));
  const unit = (n: number, short: string, word: string): Ago => ({ short: `${n}${short} ago`, long: `${plural(n, word)} ago` });
  if (age < HOUR) return { short: "Just now", long: "just now" };
  if (age < DAY) return unit(Math.floor(age / HOUR), "h", "hour");
  if (age < 7 * DAY) return unit(Math.floor(age / DAY), "d", "day");
  if (age < 30 * DAY) return unit(Math.floor(age / (7 * DAY)), "w", "week");
  return unit(Math.floor(age / (30 * DAY)), "mo", "month");
}

/** Time left on an auction or offer: "2d 4h", "3h 12m", "45m", or null once ended. */
export function timeLeft(endsAt: string, now: number = Date.now()): string | null {
  const left = Date.parse(endsAt) - now;
  if (left <= 0) return null;
  const d = Math.floor(left / DAY);
  const h = Math.floor((left % DAY) / HOUR);
  const m = Math.max(1, Math.floor((left % HOUR) / MINUTE));
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "1 day", "3 days", "2–4 days" (en dash). */
export function formatDayRange([min, max]: readonly [number, number]) {
  return min === max ? plural(min, "day") : `${formatCount(min)}–${formatCount(max)} days`;
}

/** URL slug from a listing title (R-011): lower case, letters and numbers, 60 characters at most. */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}
