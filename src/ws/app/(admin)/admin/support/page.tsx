import type { Metadata } from "next";
import { SupportPage } from "@ws/features/admin/AdminConsole";

export const metadata: Metadata = { title: "Support · Staff console" };

export default function Page() {
  return <SupportPage />;
}
