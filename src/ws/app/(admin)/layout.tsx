import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@ws/features/admin/AdminConsole";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/* Staff console (Phase 8, SCR-030). Role-gated with mock staff accounts. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="cx-container ws-page" tabIndex={-1}>
      <AdminShell>{children}</AdminShell>
    </main>
  );
}
