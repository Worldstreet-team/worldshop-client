import type { ReactNode } from "react";

/* Seller pages (Phase 7). Seller Hub pages add the SellerShell sidebar (vendor/layout.tsx). */
export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="cx-container ws-page">
      {children}
    </main>
  );
}
