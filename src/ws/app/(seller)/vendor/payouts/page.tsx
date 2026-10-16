import type { Metadata } from "next";
import { PayoutsPage } from "@ws/features/sell/HubPages";

export const metadata: Metadata = { title: "Payouts · Seller Hub", robots: { index: false, follow: false } };

export default function Page() {
  return <PayoutsPage />;
}
