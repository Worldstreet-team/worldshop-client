import type { Metadata } from "next";
import { NegotiationHub } from "@ws/features/negotiation/NegotiationHub";
import { dealListings } from "@ws/features/negotiation/data";
import { first } from "@ws/lib/search/params";
export const metadata: Metadata = { title: "Inbox", robots: { index: false, follow: false } };
export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  return <NegotiationHub mode="inbox" listings={await dealListings()} selected={first((await searchParams).listing)} />;
}
