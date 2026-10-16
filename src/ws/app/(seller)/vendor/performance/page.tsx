import type { Metadata } from "next";
import { PerformancePage } from "@ws/features/sell/HubPages";

export const metadata: Metadata = { title: "Performance · Seller Hub", robots: { index: false, follow: false } };

export default function Page() {
  return <PerformancePage />;
}
