import type { Metadata } from "next";
import { ListingWizard } from "@ws/features/sell/LiveWizard";

export const metadata: Metadata = { title: "Create a listing", robots: { index: false, follow: false } };

/* /sell/new starts a listing; /sell/:id continues a draft or edits a live one. */
export default function Page() {
  return <ListingWizard />;
}
