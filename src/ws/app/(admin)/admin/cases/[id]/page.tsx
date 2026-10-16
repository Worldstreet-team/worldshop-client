import type { Metadata } from "next";
import { CaseView } from "@ws/features/admin/AdminConsole";

export const metadata: Metadata = { title: "Case · Staff console" };

export default async function Page({ params }: PageProps<"/admin/cases/[id]">) {
  return <CaseView id={(await params).id} />;
}
