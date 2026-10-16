import type { Metadata } from "next";
import { NegotiationHub } from "@ws/features/negotiation/NegotiationHub";
import { dealListings } from "@ws/features/negotiation/data";
export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };
export default async function ThreadPage({ params }: PageProps<"/inbox/[id]">) {
  return <NegotiationHub mode="inbox" listings={await dealListings()} selected={(await params).id} />;
}
