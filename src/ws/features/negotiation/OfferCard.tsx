"use client";
import { useState } from "react";
import { buttonClass } from "@ws/components/ui";
import { formatCurrency, kobo } from "@ws/lib/money";
import { rules } from "@ws/config/marketplace-rules";
import { inputMinor, type Offer, type PaymentRequest, type Role } from "./model";
import type { Run } from "./OfferForm";

export function OfferCard({ offer, request, role, escrow, run, blocked }: { offer: Offer; request?: PaymentRequest; role: Role; escrow: boolean; run: Run; blocked: boolean }) {
  const [counter, setCounter] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "declined" | "timeout">("success");
  const respond = (event: "accept" | "decline" | "withdraw") => run({ type: "respond", id: crypto.randomUUID(), offer_id: offer.id, event });
  const canRespond = (role === "seller" && offer.status === "pending") || (role === "buyer" && offer.status === "countered");
  const active = ["pending", "countered", "accepted"].includes(offer.status);
  return <article className="ws-deal-panel ws-deal-stack" aria-label="Offer">
    <div className="ws-deal-heading"><h2>{formatCurrency(kobo(offer.amount_minor))} <span className="ws-deal-muted">each × {offer.qty}</span></h2><span className="ws-deal-status" data-testid="offer-status">{offer.status}</span></div>
    {active && <p className="ws-deal-muted">{offer.status === "accepted" ? "Pay by" : "Reply by"} <time dateTime={new Date(offer.expires_at).toISOString()}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: rules.time.zone }).format(offer.expires_at)} WAT</time></p>}
    {blocked ? <p>Unblock this seller to continue the conversation.</p> : <>
      {canRespond && <div className="ws-deal-actions">
        <button className={buttonClass({ size: "sm" })} onClick={() => respond("accept")}>Accept offer</button>
        <button className={buttonClass({ variant: "ghost", size: "sm" })} aria-expanded={counter} onClick={() => setCounter(!counter)}>Counter offer</button>
        <button className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => respond("decline")}>Decline offer</button>
      </div>}
      {canRespond && counter && <form className="ws-deal-stack" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); run({ type: "respond", id: crypto.randomUUID(), offer_id: offer.id, event: "counter", amount_minor: inputMinor(String(data.get("counter"))) }, () => setCounter(false)); }}>
        <label className="ws-field">Counter-offer per item (NGN)<input name="counter" type="number" required min="1" step="1" /></label>
        <button className={buttonClass({ variant: "ghost", size: "sm" })}>Send counter-offer</button>
      </form>}
      {role === "buyer" && offer.status === "pending" && <button className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => respond("withdraw")}>Withdraw offer</button>}
      {offer.status === "accepted" && !escrow && <p>No escrow for this category. Inspect in person before you pay.</p>}
      {offer.status === "accepted" && escrow && !request && (role === "seller" ? <form className="ws-deal-stack" onSubmit={(e) => { e.preventDefault(); run({ type: "request", id: crypto.randomUUID(), offer_id: offer.id, delivery_minor: inputMinor(String(new FormData(e.currentTarget).get("delivery"))) }); }}>
        <p>Agree delivery in chat first. The request adds that cost to the accepted item total; no other buyer fees are added.</p>
        <label className="ws-field">Agreed delivery (NGN)<input name="delivery" type="number" required min="0" step="0.01" defaultValue="0" /></label>
        <button className={buttonClass({ size: "sm" })}>Send payment request</button>
      </form> : <p>Deal agreed. Waiting for the seller’s payment request.</p>)}
      {request && <section className="ws-deal-request ws-deal-stack" aria-label="Payment request">
        <div className="ws-deal-heading"><h3>Payment request</h3><span className="ws-deal-status" data-testid="request-status">{request.status.replace("_", " ")}</span></div>
        <dl>
          <div><dt>Accepted price</dt><dd>{formatCurrency(kobo(request.unit_minor))} × {request.qty}</dd></div>
          <div><dt>Items subtotal</dt><dd>{formatCurrency(kobo(request.item_subtotal_minor))}</dd></div>
          <div><dt>Agreed delivery</dt><dd>{formatCurrency(kobo(request.delivery_minor))}</dd></div>
          <div><dt>Total</dt><dd data-testid="request-total">{formatCurrency(kobo(request.total_minor))}</dd></div>
        </dl>
        {request.status === "paid" ? <p role="status">Demo payment complete. No funds moved.</p> : request.status === "expired" ? <p>This payment request has expired.</p> : offer.status === "accepted" && role === "buyer" ? <>
          <p>This is a simulated payment into escrow. No card details are needed and no funds will move.</p>
          <p className="ws-deal-muted">Before each attempt, WorldStore rechecks availability and reserves the quantity for up to {rules.paymentRequest.lockMinutes} minutes. The agreed total cannot change.</p>
          {["declined", "timed_out"].includes(request.status) && <p role="status">Payment {request.status === "timed_out" ? "timed out" : "declined"}. No money taken. Try again before the deadline.</p>}
          <label className="ws-field">Demo payment result<select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}><option value="success">Success</option><option value="declined">Declined</option><option value="timeout">Timeout</option></select></label>
          <button className={buttonClass({ size: "sm" })} onClick={() => run({ type: "pay", id: crypto.randomUUID(), offer_id: offer.id, outcome })}>Simulate payment</button>
        </> : offer.status === "accepted" ? <p>Waiting for the buyer to pay.</p> : <p>This payment request can no longer be paid.</p>}
      </section>}
    </>}
  </article>;
}
