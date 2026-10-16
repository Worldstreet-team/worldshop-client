"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { rules } from "@ws/config/marketplace-rules";
import { GlobalSearchBox } from "@ws/features/search/GlobalSearchBox";
import { useProhibited } from "@ws/features/search/prohibited";
import { parseRadius, radiusParam } from "@ws/lib/search/radius";

/* The header's search box. On /search it shows the query being viewed; everywhere it
   keeps a non-default radius so a new search stays in the same area (R-001). */
export function HeaderSearch({ trending, scopes }: { trending: readonly string[]; scopes?: readonly { id: string; name: string }[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const prohibited = useProhibited();
  const q = pathname === "/search" ? (params.get("q") ?? "") : "";
  const cat = pathname === "/search" ? (params.get("cat") ?? "") : "";
  const radius = parseRadius(params.get("radius") ?? undefined);
  const keep: Record<string, string> = radius === rules.location.defaultRadiusKm ? {} : { radius: radiusParam(radius) };
  const blocked = prohibited !== null && prohibited === q;
  return (
    <GlobalSearchBox
      key={`${q}|${cat}`}
      defaultValue={q}
      trending={blocked ? [] : trending}
      keep={keep}
      suggestions={!blocked}
      inputId="site-search"
      scopes={scopes}
      scope={cat}
    />
  );
}
