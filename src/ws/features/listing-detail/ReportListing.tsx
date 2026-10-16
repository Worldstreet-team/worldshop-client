"use client";

import { useActionState, useEffect, useRef } from "react";
import { FlagIcon, XmarkCircleIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { REPORT_REASONS, REPORT_THANKS } from "@ws/lib/copy/listing";
import { addReport } from "@ws/features/admin/model";
import { updateAdmin } from "@ws/features/admin/store";
import type { ReportReason } from "@ws/lib/copy/listing";
import type { ReportState } from "./report-action";

/* ReportListingModal (spec §7): reason (radios), optional details, send. A native modal
   dialog opened with invoker commands; a plain form posting to a Server Action, so it
   works before scripts load. Errors sit next to the field and take focus (R-042). */

export const REPORT_ID = "report-listing";
const command = (action: "show-modal" | "close") => ({ commandfor: REPORT_ID, command: action }) as Record<string, string>;

export function ReportButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? buttonClass({ variant: "quiet", size: "sm" })}
      aria-haspopup="dialog"
      {...command("show-modal")}
      onClick={() => {
        const d = document.getElementById(REPORT_ID) as HTMLDialogElement | null;
        if (d && !d.open) d.showModal();
      }}
    >
      <FlagIcon />
      Report this listing
    </button>
  );
}

type Props = {
  listingId: string;
  title: string;
  /** Shop name, kept with the report for the moderation queue. */
  sellerName?: string;
  /** The Server Action (./report-action.ts); injectable for stories. */
  submit: (prev: ReportState, form: FormData) => Promise<ReportState>;
};

export function ReportListingModal({ listingId, title, sellerName = "", submit }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitted = useRef<FormData | null>(null);
  const [state, action, pending] = useActionState<ReportState, FormData>(submit, { status: "idle" });
  const error = state.status === "error" ? state : null;
  // The server accepted it; queue it for moderation (device-local until the ops service exists).
  useEffect(() => {
    const form = submitted.current;
    if (state.status !== "sent" || !form) return;
    submitted.current = null;
    try { updateAdmin((s) => addReport(s, { id: crypto.randomUUID(), listing_id: listingId, title, seller: sellerName, reason: String(form.get("reason")) as ReportReason, details: String(form.get("details") ?? "").trim(), at: Date.now() })); } catch { /* storage blocked: the server copy stands */ }
  }, [state, listingId, title, sellerName]);
  const close = () => dialog.current?.close();

  return (
    <dialog ref={dialog} id={REPORT_ID} className="ws-modal" aria-labelledby={`${REPORT_ID}-title`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ws-modal__panel">
        <div className="ws-modal__head">
          <h2 id={`${REPORT_ID}-title`} className="ws-modal__title">
            Report this listing
          </h2>
          <button type="button" className={buttonClass({ variant: "quiet", size: "sm", icon: true })} aria-label="Close" {...command("close")} onClick={close}>
            <XmarkCircleIcon />
          </button>
        </div>

        {state.status === "sent" ? (
          <div className="ws-report__sent" role="status">
            <p>{REPORT_THANKS}</p>
            <button type="button" className={buttonClass({ variant: "ghost" })} {...command("close")} onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <form action={action} onSubmit={(e) => { submitted.current = new FormData(e.currentTarget); }} className="ws-report" noValidate>
            <p className="ws-share__title">{title}</p>
            <input type="hidden" name="listing" value={listingId} />
            <fieldset className="ws-field" aria-describedby={error?.field === "reason" ? `${REPORT_ID}-reason-error` : undefined}>
              <legend>What&apos;s wrong?</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className="ws-report__reason">
                  <input type="radio" name="reason" value={r.id} required />
                  <span>
                    {r.label}
                    {"hint" in r && <span className="ws-report__hint">{r.hint}</span>}
                  </span>
                </label>
              ))}
              {error?.field === "reason" && (
                <p id={`${REPORT_ID}-reason-error`} className="ws-field__error" ref={(el) => el?.scrollIntoView({ block: "nearest" })}>
                  {error.message}
                </p>
              )}
            </fieldset>
            <div className="ws-field">
              <label htmlFor={`${REPORT_ID}-details`}>Details (optional)</label>
              <textarea
                id={`${REPORT_ID}-details`}
                name="details"
                rows={3}
                maxLength={rules.moderation.reportDetailsMax}
                className="ws-textarea"
                aria-invalid={error?.field === "details" || undefined}
                aria-describedby={error?.field === "details" ? `${REPORT_ID}-details-error` : undefined}
                ref={(el) => {
                  if (error?.field === "details") el?.focus();
                }}
              />
              {error?.field === "details" && (
                <p id={`${REPORT_ID}-details-error`} className="ws-field__error">
                  {error.message}
                </p>
              )}
            </div>
            {error?.field === "form" && (
              <p className="ws-field__error" role="alert">
                {error.message}
              </p>
            )}
            <div className="ws-modal__actions">
              <button type="button" className={buttonClass({ variant: "ghost" })} {...command("close")} onClick={close}>
                Cancel
              </button>
              <button type="submit" className={buttonClass({})} disabled={pending}>
                {pending ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
