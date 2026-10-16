import { Fragment } from "react";
import { suggestionMatch } from "@ws/lib/search/words";

/* Reverse highlighting (Baymard autocomplete, NN/g, eBay): what the buyer typed stays
   plain and the rest of the suggestion is bold, so the difference is what stands out. */
export function SuggestionText({ text, typed }: { text: string; typed: string }) {
  const ranges = suggestionMatch(text, typed);
  if (!typed.trim() || !ranges) return <>{text}</>;
  const parts: { s: string; typed: boolean }[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push({ s: text.slice(at, start), typed: false });
    if (end > start) parts.push({ s: text.slice(start, end), typed: true });
    at = Math.max(at, end);
  }
  if (at < text.length) parts.push({ s: text.slice(at), typed: false });
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p.typed ? <span className="ws-suggest__typed">{p.s}</span> : <b className="ws-suggest__more">{p.s}</b>}</Fragment>
      ))}
    </>
  );
}
