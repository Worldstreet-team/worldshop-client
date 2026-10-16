import type { ListingWithSeller } from "@ws/lib/data/types";
import { SYNONYMS, normalise, wordMatches, words } from "./words";

/*
 * Search queries (flows B2). Words are matched as prefixes, so "head" finds
 * "headphones", and every word must match somewhere (AND). Edge cases:
 * EC-001 only stop words → browse everything; EC-002 a listing id or URL → go to it;
 * EC-004 a prohibited term → neutral "No results" with a policy link, no suggestions.
 */

const STOP_WORDS = new Set([
  "a", "an", "and", "any", "for", "i", "in", "is", "me", "my", "near", "of", "on", "or", "some", "the", "to", "want", "with",
]);

/**
 * Prohibited searches (EC-004). Illustrative: ops own the real list (R-110), and it
 * belongs in the moderation service, not the client bundle.
 */
const PROHIBITED = new Set(["gun", "guns", "pistol", "rifle", "ammunition", "ammo", "cocaine", "heroin", "tramadol", "codeine"]);

export type ParsedQuery =
  | { kind: "browse"; raw: string }
  | { kind: "text"; raw: string; tokens: string[] }
  | { kind: "listing-id"; raw: string; id: string }
  | { kind: "prohibited"; raw: string };

export function parseQuery(input: string | undefined): ParsedQuery {
  const raw = (input ?? "").trim().slice(0, 200);
  const id = /^\d{6}$/.exec(raw)?.[0] ?? /\/listing\/(\d{6})(?:-|$|\?|\/)/.exec(raw)?.[1];
  if (id) return { kind: "listing-id", raw, id };

  const all = words(raw);
  if (all.some((w) => PROHIBITED.has(w))) return { kind: "prohibited", raw };
  const tokens = all.filter((w) => !STOP_WORDS.has(w)).flatMap((w) => words(SYNONYMS[w] ?? w));
  return tokens.length === 0 ? { kind: "browse", raw } : { kind: "text", raw, tokens: [...new Set(tokens)] };
}

/**
 * Where a word is found, and how much that says about the listing. A shop's name
 * doesn't describe the item, so it can't make a listing match on its own (research
 * 6 Oct: weak matches crowded price sorts); shop searches belong to seller suggestions.
 */
const FIELDS = [
  { weight: 1, get: (l: ListingWithSeller) => l.title },
  { weight: 0.6, get: (l: ListingWithSeller) => l.category.name },
  { weight: 0.5, get: (l: ListingWithSeller) => l.attributes.map((a) => a.value).join(" ") },
];

/**
 * The listings matching every token, with a relevance in [0, 1] for best match: the
 * mean of each token's best field weight, plus a little when the title holds the
 * whole phrase.
 */
export function matchListings(listings: readonly ListingWithSeller[], tokens: readonly string[], raw = ""): Map<string, number> {
  const phrase = normalise(raw.trim());
  const result = new Map<string, number>();
  for (const l of listings) {
    const fields = FIELDS.map((f) => ({ weight: f.weight, words: words(f.get(l)) }));
    let total = 0;
    let all = true;
    for (const t of tokens) {
      const hit = (w: string) => wordMatches(w, t);
      const best = Math.max(0, ...fields.filter((f) => f.words.some(hit)).map((f) => f.weight));
      if (best === 0) {
        all = false;
        break;
      }
      total += best;
    }
    if (!all) continue;
    const bonus = phrase.length > 2 && normalise(l.title).includes(phrase) ? 0.1 : 0;
    result.set(l.id, Math.min(1, total / tokens.length + bonus));
  }
  return result;
}
