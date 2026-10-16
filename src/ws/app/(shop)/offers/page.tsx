import type { Metadata } from "next";
import { NegotiationHub } from "@ws/features/negotiation/NegotiationHub";
import { dealListings } from "@ws/features/negotiation/data";
import { first } from "@ws/lib/search/params";
export const metadata: Metadata = { title: "Offers", robots: { index: false, follow: false } };
export default async function OffersPage({ searchParams }: PageProps<"/offers">) {
  const query = await searchParams;
  const qty = Number(first(query.qty) ?? 1);
  return <NegotiationHub mode="offers" listings={await dealListings()} selected={first(query.listing)} qty={Number.isSafeInteger(qty) && qty > 0 ? qty : 1} initialRole={first(query.as) === "seller" ? "seller" : "buyer"} />;
}
