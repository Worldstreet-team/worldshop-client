import type { Metadata } from "next";
import { priceGuidance } from "@ws/features/sell/model";
import { ListingWizard } from "@ws/features/sell/ListingWizard";
import { repos } from "@ws/lib/data";

export const metadata: Metadata = { title: "Create a listing", robots: { index: false, follow: false } };

export default async function Page({ params }: PageProps<"/sell/[draftId]">) {
  const [{ draftId }, categories, listings] = await Promise.all([params, repos.categories.list(), repos.listings.list({ status: ["live"] })]);
  return <ListingWizard draftId={draftId} categories={categories} guidance={priceGuidance(listings)} />;
}
