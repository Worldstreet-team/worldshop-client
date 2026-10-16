import type { Metadata } from "next";
import { LiveHub } from "@ws/features/negotiation/LiveHub";
import { dealListings } from "@ws/features/negotiation/data";
import { first } from "@ws/lib/search/params";

export const metadata: Metadata = { title: "Conversation", robots: { index: false, follow: false } };

export default async function ThreadPage({ params, searchParams }: PageProps<"/inbox/[id]">) {
  const as = first((await searchParams).as);
  return <LiveHub mode="inbox" listings={await dealListings()} selected={(await params).id} initialRole={as === "seller" ? "seller" : "buyer"} />;
}
