import { rules } from "@ws/config/marketplace-rules";
import { REPORT_REASONS, type ReportReason } from "@ws/lib/copy/listing";
import { reportService, type ReportReason as ApiReason } from "@/features/reports/api";
import { toApiError } from "@/shared/lib/api";

export type ReportState = { status: "idle" } | { status: "sent" } | { status: "error"; field: "reason" | "details" | "form"; message: string };

/*
 * The reference's reasons are finer than the moderation queue's. Counterfeit has no
 * reason of its own there; it files as prohibited with the word kept in the details,
 * so the moderator still sees what the buyer meant.
 */
const TO_API: Record<ReportReason, ApiReason> = {
  prohibited: "PROHIBITED",
  counterfeit: "PROHIBITED",
  scam: "SCAM",
  misleading: "MISLEADING",
  wrong_category: "MISCATEGORISED",
  offensive: "OFFENSIVE",
  other: "OTHER",
};

/** ReportListingModal's submit: checked here, then filed in the moderation queue (POST /reports). */
export async function reportListing(_prev: ReportState, form: FormData): Promise<ReportState> {
  const reason = String(form.get("reason") ?? "") as ReportReason;
  const details = String(form.get("details") ?? "").trim();
  if (!REPORT_REASONS.some((r) => r.id === reason)) return { status: "error", field: "reason", message: "Choose a reason." };
  if (details.length > rules.moderation.reportDetailsMax) {
    return { status: "error", field: "details", message: `Keep it under ${rules.moderation.reportDetailsMax} characters.` };
  }
  if (reason === "other" && details.length === 0) return { status: "error", field: "details", message: "Tell us what's wrong." };
  try {
    await reportService.create({
      targetType: "LISTING",
      targetId: String(form.get("listing") ?? ""),
      reason: TO_API[reason],
      details: (reason === "counterfeit" ? ["Counterfeit.", details] : [details]).filter(Boolean).join(" ") || undefined,
    });
    return { status: "sent" };
  } catch (err) {
    const e = toApiError(err, "Your report didn't send. Try again.");
    if (e.statusCode === 401) return { status: "error", field: "form", message: "Sign in to report a listing." };
    if (e.statusCode === 404) return { status: "error", field: "form", message: "We couldn't find this listing. It may have been removed already." };
    // Reporting the same listing twice is answered as a conflict; the first report stands.
    if (e.statusCode === 409) return { status: "sent" };
    return { status: "error", field: "form", message: e.message };
  }
}
