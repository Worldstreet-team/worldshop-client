"use client";

import { useEffect } from "react";
import { setProhibited } from "./prohibited";
import { removeRecentSearch } from "./recent";

/** Rendered by the results page for a prohibited query (EC-004). */
export function MarkProhibited({ term }: { term: string }) {
  useEffect(() => {
    setProhibited(term);
    removeRecentSearch(term);
    return () => setProhibited(null);
  }, [term]);
  return null;
}
