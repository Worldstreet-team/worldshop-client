import type { Metadata } from "next";
import { LiveHub } from "@ws/features/negotiation/LiveHub";
import { dealListings } from "@ws/features/negotiation/data";
import { first } from "@ws/lib/search/params";

export const metadata: Metadata = { title: "Offers", robots: { index: false, follow: false } };

export default async function OffersPage({ searchParams }: PageProps<"/offers">) {
  const query = await searchParams;
  return <LiveHub mode="offers" listings={await dealListings()} listingId={first(query.listing)} initialRole={first(query.as) === "seller" ? "seller" : "buyer"} />;
}
