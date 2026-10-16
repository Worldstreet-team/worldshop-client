import type { Metadata } from "next";
import Link from "next/link";
import { SavedListings, SavedSearches, SavedSellers } from "@ws/features/saved/SavedPanels";
import { first } from "@ws/lib/search/params";

/* SCR-006 Saved (flows B4): Listings · Sellers · Searches. The lists are kept on this
   device until accounts exist, so the panels fill in once the page has loaded. */

export const metadata: Metadata = { title: "Saved", robots: { index: false, follow: false } };

const TABS = [
  { id: "listings", label: "Listings" },
  { id: "sellers", label: "Sellers" },
  { id: "searches", label: "Searches" },
] as const;

export default async function SavedPage({ searchParams }: PageProps<"/saved">) {
  const wanted = first((await searchParams).tab);
  const tab = TABS.find((t) => t.id === wanted)?.id ?? "listings";
  return (
    <div className="ws-saved-page">
      <h1 className="ws-saved-page__title">Saved</h1>
      <nav aria-label="Saved" className="ws-tabs">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "listings" ? "/saved" : `/saved?tab=${t.id}`} className="ws-tabs__tab" aria-current={t.id === tab ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "listings" ? <SavedListings /> : tab === "searches" ? <SavedSearches /> : <SavedSellers />}
    </div>
  );
}
