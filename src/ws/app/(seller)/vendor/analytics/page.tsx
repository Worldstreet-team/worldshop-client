import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { rules } from "@ws/config/marketplace-rules";
import { AnalyticsPage } from "@ws/features/sell/HubPages";

export const metadata: Metadata = { title: "Analytics · Seller Hub", robots: { index: false, follow: false } };

export default function Page() {
  if (!rules.flags.analytics) notFound();
  return <AnalyticsPage />;
}
