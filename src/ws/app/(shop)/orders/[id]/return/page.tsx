import type { Metadata } from "next";
import { ReturnInstructions } from "@ws/features/orders/ReturnInstructions";

export const metadata: Metadata = { title: "Return an order", robots: { index: false, follow: false } };
export default async function ReturnPage({ params }: PageProps<"/orders/[id]/return">) {
  return <ReturnInstructions id={(await params).id} />;
}
