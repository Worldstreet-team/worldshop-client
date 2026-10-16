/* Search state lives in the URL (R-011): /search?q=&cat=&min=&max=&sort=&radius=.
   Helpers build hrefs that change one value and keep the rest. */

export type SearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** `pathname?…` with `key` set to `value` (or removed when null). Paging resets. */
export function hrefWith(pathname: string, params: SearchParams, key: string, value: string | null) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === key || k === "page" || v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) next.append(k, item);
  }
  if (value !== null) next.set(key, value);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** `pathname?…` with several params changed at once (null removes). Paging resets. */
export function hrefSet(pathname: string, params: SearchParams, changes: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k in changes || k === "page" || v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) next.append(k, item);
  }
  for (const [k, v] of Object.entries(changes)) if (v !== null) next.set(k, v);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
