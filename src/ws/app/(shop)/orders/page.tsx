import type { Metadata } from "next";
import { OrdersPage } from "@ws/features/orders/OrdersPage";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };

export default function Page() {
  // A request timestamp is intentionally captured once so the browser can correct clock skew.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <OrdersPage serverNow={serverNow} />;
}
