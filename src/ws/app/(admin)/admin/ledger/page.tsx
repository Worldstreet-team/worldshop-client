import type { Metadata } from "next";
import { LedgerPage } from "@ws/features/admin/AdminConsole";

export const metadata: Metadata = { title: "Ledger · Staff console" };

export default function Page() {
  return <LedgerPage />;
}
