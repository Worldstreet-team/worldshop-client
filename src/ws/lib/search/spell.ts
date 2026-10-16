import { rules } from "@ws/config/marketplace-rules";
import type { Category, ListingWithSeller } from "@ws/lib/data/types";
import { SYNONYMS, normalise, wordMatches, words } from "./words";

/*
 * "Did you mean…" (flows B2 zero results, spec §6 SpellCorrection, UI research C16:
 * a link, never a silent auto-correct). Each typed word that matches nothing is
 * swapped for the closest catalogue word one edit away (Damerau–Levenshtein: a
 * missing, extra, wrong or swapped letter); short words are left alone because one
 * edit changes them too much. The caller only shows the suggestion when it finds
 * more than the original query.
 */

/** Optimal string alignment distance, stopping early once it exceeds `max`. */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** Every word buyers could be looking for: titles, categories, attributes, local spellings. */
export function vocabulary(listings: readonly ListingWithSeller[], categories: readonly Category[]): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (text: string) => words(text).forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));
  listings.forEach((l) => {
    add(l.title);
    l.attributes.forEach((a) => add(a.value));
  });
  categories.forEach((c) => add(c.name));
  Object.values(SYNONYMS).forEach(add);
  return counts;
}

/** The corrected query, or null when every word is fine or nothing is close enough. */
export function correct(raw: string, vocab: ReadonlyMap<string, number>): string | null {
  const known = [...vocab.keys()];
  let changed = false;
  const out = raw
    .trim()
    .split(/\s+/)
    .map((token) => {
      const w = normalise(token).replace(/[^\p{Letter}\p{Number}]/gu, "");
      if (w.length < rules.search.spellMinLength || SYNONYMS[w] || known.some((k) => wordMatches(k, w))) return token;
      let best: string | null = null;
      let bestScore = -Infinity;
      for (const k of known) {
        if (editDistance(w, k, rules.search.spellMaxEdits) > rules.search.spellMaxEdits) continue;
        const score = vocab.get(k)! - Math.abs(k.length - w.length) * 0.1;
        if (score > bestScore) [best, bestScore] = [k, score];
      }
      if (!best) return token;
      changed = true;
      return best;
    });
  return changed ? out.join(" ") : null;
}
