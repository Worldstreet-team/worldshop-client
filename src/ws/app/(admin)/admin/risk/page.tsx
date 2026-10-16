import type { Metadata } from "next";
import { RiskPage } from "@ws/features/admin/AdminConsole";

export const metadata: Metadata = { title: "Risk · Staff console" };

export default function Page() {
  return <RiskPage />;
}
