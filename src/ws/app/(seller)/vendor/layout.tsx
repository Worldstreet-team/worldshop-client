import type { ReactNode } from "react";
import { SellerShell } from "@ws/features/sell/LiveSeller";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <SellerShell>{children}</SellerShell>;
}
