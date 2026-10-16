import type { Metadata } from "next";
import { SellerHub } from "@ws/features/sell/SellerHub";

export const metadata: Metadata = { title: "Seller Hub", robots: { index: false, follow: false } };

export default function Page() {
  return <SellerHub />;
}
