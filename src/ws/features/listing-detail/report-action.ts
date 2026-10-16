"use server";

import { rules } from "@ws/config/marketplace-rules";
import { REPORT_REASONS, type ReportReason } from "@ws/lib/copy/listing";
import { repos } from "@ws/lib/data";

export type ReportState = { status: "idle" } | { status: "sent" } | { status: "error"; field: "reason" | "details" | "form"; message: string };

/**
 * ReportListingModal's submit (flows §632 moderation queue, `evt_report_listing`).
 * Server Actions take any POST, so everything is checked here. There's no moderation
 * queue yet: a valid report is accepted and dropped until the admin phase.
 */
export async function reportListing(_prev: ReportState, form: FormData): Promise<ReportState> {
  const reason = String(form.get("reason") ?? "") as ReportReason;
  const details = String(form.get("details") ?? "").trim();
  if (!REPORT_REASONS.some((r) => r.id === reason)) return { status: "error", field: "reason", message: "Choose a reason." };
  if (details.length > rules.moderation.reportDetailsMax) {
    return { status: "error", field: "details", message: `Keep it under ${rules.moderation.reportDetailsMax} characters.` };
  }
  if (reason === "other" && details.length === 0) return { status: "error", field: "details", message: "Tell us what's wrong." };
  const listing = await repos.listings.get(String(form.get("listing") ?? ""));
  if (!listing) return { status: "error", field: "form", message: "We couldn't find this listing. It may have been removed already." };
  return { status: "sent" };
}
