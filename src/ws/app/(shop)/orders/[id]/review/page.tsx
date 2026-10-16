import type { Metadata } from "next";
import { ReviewForm } from "@ws/features/orders/ReviewForm";

export const metadata: Metadata = { title: "Review your purchase", robots: { index: false, follow: false } };

export default async function ReviewPage({ params }: PageProps<"/orders/[id]/review">) {
  return <ReviewForm id={(await params).id} />;
}
