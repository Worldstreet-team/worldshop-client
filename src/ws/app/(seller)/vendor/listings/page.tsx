import type { Metadata } from "next";
import { ListingsPage } from "@ws/features/sell/LiveSeller";
import { first } from "@ws/lib/search/params";

export const metadata: Metadata = { title: "Listings · Seller Hub", robots: { index: false, follow: false } };

/* ?tab=DRAFT opens on the drafts, as the hub's "Publish a listing" task links. */
export default async function Page({ searchParams }: PageProps<"/vendor/listings">) {
  const tab = first((await searchParams).tab);
  return <ListingsPage key={tab} initialTab={tab} />;
}
