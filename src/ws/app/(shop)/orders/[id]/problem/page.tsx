import type { Metadata } from "next";
import { ReportProblemWizard } from "@ws/features/orders/ReportProblemWizard";

export const metadata: Metadata = { title: "Report an order problem", robots: { index: false, follow: false } };

export default async function ProblemPage({ params }: PageProps<"/orders/[id]/problem">) {
  return <ReportProblemWizard id={(await params).id} />;
}
