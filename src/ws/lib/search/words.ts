/*
 * Word handling shared by results matching (server) and search suggestions (browser),
 * so both agree on what matches. The prohibited-terms list stays in query.ts, on the
 * server only.
 */

/**
 * Local spellings and shorthand (EC-003). A starter set; ops maintain the real table.
 * Keys are matched after lowercasing and accent stripping.
 */
export const SYNONYMS: Readonly<Record<string, string>> = {
  fone: "phone",
  phon: "phone",
  gen: "generator",
  gena: "generator",
  telly: "tv",
  ac: "air conditioner",
  lappy: "laptop",
  sneakers: "nike",
};

export const normalise = (s: string) => s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export const words = (s: string) => normalise(s).split(/[^\p{Letter}\p{Number}]+/u).filter(Boolean);

/** One-letter words must match a whole word; longer ones may be a prefix. */
export const wordMatches = (word: string, token: string) => (token.length < 2 ? word === token : word.startsWith(token));

/**
 * Where the typed text matches a suggestion, for reverse highlighting: each typed word
 * must prefix-match a word of the suggestion (the last typed word may also match
 * through its synonym). Returns the matched [start, end) ranges in the suggestion, or
 * null when it doesn't match.
 */
export function suggestionMatch(suggestion: string, typed: string): [number, number][] | null {
  const tokens = words(typed);
  if (tokens.length === 0) return [];
  const spans: { start: number; word: string }[] = [];
  const re = /[\p{Letter}\p{Number}]+/gu;
  for (let m; (m = re.exec(suggestion)); ) spans.push({ start: m.index, word: normalise(m[0]) });

  const ranges: [number, number][] = [];
  for (const [i, token] of tokens.entries()) {
    const options = i === tokens.length - 1 && SYNONYMS[token] ? [token, ...words(SYNONYMS[token])] : [token];
    const hit = options.map((t) => ({ t, span: spans.find((s) => wordMatches(s.word, t)) })).find((h) => h.span);
    if (!hit?.span) return null;
    // A synonym match highlights nothing typed: the whole word is "suggested".
    if (hit.t === token) ranges.push([hit.span.start, hit.span.start + token.length]);
  }
  return ranges.sort((a, b) => a[0] - b[0]);
}
