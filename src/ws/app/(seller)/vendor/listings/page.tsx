import type { Metadata } from "next";
import { ListingsPage } from "@ws/features/sell/HubPages";

export const metadata: Metadata = { title: "Listings · Seller Hub", robots: { index: false, follow: false } };

export default function Page() {
  return <ListingsPage />;
}
