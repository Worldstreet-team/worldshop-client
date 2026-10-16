import type { Metadata } from "next";
import { OrderDetail } from "@ws/features/orders/OrderDetail";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  // A request timestamp is intentionally captured once so the browser can correct clock skew.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();
  return <OrderDetail id={(await params).id} serverNow={serverNow} />;
}
