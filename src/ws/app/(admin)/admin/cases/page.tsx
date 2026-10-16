import type { Metadata } from "next";
import { CasesPage } from "@ws/features/admin/AdminConsole";

export const metadata: Metadata = { title: "Cases · Staff console" };

export default function Page() {
  return <CasesPage />;
}
