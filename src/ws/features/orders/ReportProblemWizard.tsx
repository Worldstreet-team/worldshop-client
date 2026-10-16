"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { needsMediaEvidence, type DisputeReason } from "./model";
import { dispatchOrder, useOrders } from "./store";

const reasons: readonly [DisputeReason, string][] = [
  ["wrong_item", "Wrong item"],
  ["damaged", "Damaged or faulty"],
  ["not_as_described", "Not as described"],
  ["missing_parts", "Missing parts"],
  ["other", "Something else"],
];

export function ReportProblemWizard({ id }: { id: string }) {
  const router = useRouter();
  const order = useOrders().orders.find((item) => item.id === id);
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState<DisputeReason | "">("");
  const [detail, setDetail] = useState("");
  const [mediaReady, setMediaReady] = useState(false);
  const [opened, setOpened] = useState("");
  const [error, setError] = useState("");
  if (!order) return <h1>Order not found</h1>;
  if (order.status !== "delivered" || order.dispute) return <section className="ws-order-empty"><h1>Problem report not available</h1><p>{order.dispute ? "A case is already open for this order." : "A problem can be reported after delivery while the inspection window is open."}</p><Link className={buttonClass({ variant: "ghost" })} href={`/orders/${id}`}>Back to order</Link></section>;

  const next = () => {
    setError("");
    if (step === 1 && !reason) return setError("Choose what happened.");
    if (step === 2 && detail.trim().length < 10) return setError("Describe the problem in at least 10 characters.");
    if (step === 2 && !opened) return setError("Say whether you opened the package.");
    if (step === 2 && reason && needsMediaEvidence(reason) && !mediaReady) return setError("Confirm that you have photo or video evidence ready.");
    setStep((old) => Math.min(4, old + 1));
  };
  const submit = () => {
    if (!reason) return;
    try {
      dispatchOrder({ type: "dispute", id: crypto.randomUUID(), order_id: id, reason, detail, remedy: "refund", package_opened: opened === "yes", media_ready: mediaReady });
      router.push(`/orders/${id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open this case."); }
  };

  return <div className="ws-order-form">
    <p className="ws-order-eyebrow">Step {step} of 4</p><h1>Report a problem</h1><p>{order.title} · Submitting freezes this order’s escrow immediately.</p>
    {error && <p role="alert" className="ws-deal-warning">{error}</p>}
    {step === 1 && <fieldset><legend>What happened?</legend>{reasons.map(([value, label]) => <label key={value} className="ws-order-choice"><input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</fieldset>}
    {step === 2 && <div className="ws-order-evidence"><label>Evidence and details<textarea value={detail} onChange={(event) => setDetail(event.target.value)} rows={7} placeholder="Describe what arrived and what the listing promised." /></label><fieldset><legend>Did you open the package?</legend>{[["yes", "Yes"], ["no", "No"]].map(([value, label]) => <label key={value} className="ws-order-choice"><input type="radio" name="opened" value={value} checked={opened === value} onChange={() => setOpened(value)} />{label}</label>)}</fieldset>{reason && needsMediaEvidence(reason) && <label className="ws-order-choice"><input type="checkbox" checked={mediaReady} onChange={(event) => setMediaReady(event.target.checked)} />I have photos or video showing the problem</label>}<small>Keep the original files. Durable uploads connect to the case service in production.</small></div>}
    {step === 3 && <section className="ws-order-summary"><h2>Requested outcome</h2><p>This device-local demo supports a full refund decision. Partial refunds, replacements and return labels require the production case service.</p><strong>Full refund</strong></section>}
    {step === 4 && <section className="ws-order-summary"><h2>Review your case</h2><dl><div><dt>Problem</dt><dd>{reasons.find(([value]) => value === reason)?.[1]}</dd></div><div><dt>Details</dt><dd>{detail}</dd></div><div><dt>Package opened</dt><dd>{opened}</dd></div><div><dt>Requested outcome</dt><dd>Full refund</dd></div></dl><p>The seller gets {rules.disputes.sellerResponseHours} hours to respond. WorldStore does not automatically decide the case in this demo.</p></section>}
    <div className="ws-order-actions">{step > 1 && <button className={buttonClass({ variant: "ghost" })} onClick={() => setStep((old) => old - 1)}>Back</button>}<button className={buttonClass({})} onClick={step === 4 ? submit : next}>{step === 4 ? "Submit case" : "Continue"}</button></div>
  </div>;
}
