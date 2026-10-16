import { rules } from "@ws/config/marketplace-rules";
import { getHidden } from "@ws/features/hidden/server";
import { getAnchor } from "@ws/features/location/server";
import { repos } from "@ws/lib/data";
import type { ListingStatus } from "@ws/lib/data/types";
import { parseFilters } from "@ws/lib/search/filters";
import { parseQuery } from "@ws/lib/search/query";
import { parseRadius } from "@ws/lib/search/radius";
import { runSearch } from "@ws/lib/search/run";
import { suggest } from "@ws/lib/search/suggest";

/*
 * The reference app's three internal endpoints (app/api/*), answered in the browser.
 * Its client components fetch them; with no Next server here they call localFetch,
 * which runs the same handler code over the same repos and returns a Response, so the
 * callers' parsing stays as written.
 */

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });

function paramsOf(sp: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

/** /api/listings?ids=a,b: device-kept lists (Saved, Recently viewed). Sold and ended come back so Saved can mark them. */
async function listings(sp: URLSearchParams) {
  const SHOWN: ListingStatus[] = ["live", "reserved", "sold", "ended", "paused"];
  const ids = (sp.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[A-Za-z0-9]{1,40}$/.test(id))
    .slice(0, 500);
  if (ids.length === 0) return json({ items: [] });
  return json({ items: await repos.listings.list({ ids, status: SHOWN }) });
}

/** /api/search-count?…: the filter sheet's "Show N results". Same search as the page. */
async function searchCount(sp: URLSearchParams) {
  const params = paramsOf(sp);
  const parsed = parseQuery(sp.get("q") ?? undefined);
  if (parsed.kind === "prohibited") return json({ total: 0 });
  const [{ anchor }, hidden, categories, all] = await Promise.all([getAnchor(), getHidden(), repos.categories.list(), repos.listings.list()]);
  const query = parsed.kind === "listing-id" ? { kind: "text" as const, raw: parsed.raw, tokens: [parsed.id] } : parsed;
  const result = runSearch({
    listings: all,
    query,
    filters: parseFilters(params, categories.map((c) => c.id)),
    anchor,
    radius: parseRadius(params.radius),
    sort: "best",
    page: 1,
    hidden,
    city: anchor.city,
  });
  return json({ total: result.total });
}

/** /api/suggest?q=…&max=…: the search box's type-ahead. */
async function suggestions(sp: URLSearchParams) {
  const typed = (sp.get("q") ?? "").slice(0, 200);
  const max = Math.min(Number(sp.get("max")) || rules.search.maxSuggestions, rules.search.maxSuggestions);
  const [all, categories, sellers, trending] = await Promise.all([repos.listings.list(), repos.categories.list(), repos.sellers.list(), repos.search.trending()]);
  return json({ items: suggest({ typed, listings: all, categories, sellers, trending, max }) });
}

const ROUTES: Record<string, (sp: URLSearchParams) => Promise<Response>> = {
  "/api/listings": listings,
  "/api/search-count": searchCount,
  "/api/suggest": suggestions,
};

export async function localFetch(input: string, init?: { signal?: AbortSignal; cache?: string }): Promise<Response> {
  const url = new URL(input, window.location.origin);
  const handler = ROUTES[url.pathname];
  if (!handler) return new Response(null, { status: 404 });
  init?.signal?.throwIfAborted();
  const res = await handler(url.searchParams);
  init?.signal?.throwIfAborted();
  return res;
}
