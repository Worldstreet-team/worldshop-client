"use client";
import { useState } from "react";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { formatCurrency, kobo } from "@ws/lib/money";
import { inputMinor, unsafeMessage, type Command } from "./model";

export type Run = (command: Command, done?: () => void) => void;
export function OfferForm({ price, qty, available, left, run }: { price: number; qty: number; available: number; left: number; run: Run }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [acknowledge, setAcknowledge] = useState(false);
  const risky = unsafeMessage(note);
  return <form className="ws-deal-panel ws-deal-stack" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run({ type: "offer", id: crypto.randomUUID(), amount_minor: inputMinor(amount), qty: Number(data.get("qty")), note, acknowledge });
  }}>
    <h2>Make an offer</h2>
    <p>Asking {formatCurrency(kobo(price))} each. You have {left} offers left on this item.</p>
    <label className="ws-field">Your offer per item (NGN)
      <input name="amount" type="number" inputMode="numeric" required min={Math.ceil(price * rules.offers.floorPercent / 100 / rules.money.minorPerMajor)} max={price / rules.money.minorPerMajor} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} aria-describedby="offer-help" />
    </label>
    <div className="ws-deal-actions" aria-label="Suggested offers">
      {rules.offers.quickPercent.map((percent) => <button key={percent} type="button" className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => setAmount(String(Math.floor(price * percent / 100 / rules.money.minorPerMajor)))}>{formatCurrency(kobo(Math.floor(price * percent / 100 / rules.money.minorPerMajor) * rules.money.minorPerMajor))}</button>)}
    </div>
    <label className="ws-field">Quantity<input name="qty" type="number" required min="1" max={available} defaultValue={qty} step="1" /></label>
    <label className="ws-field">Note (optional)<textarea value={note} onChange={(e) => { setNote(e.target.value); setAcknowledge(false); }} maxLength={rules.messaging.maxChars} rows={3} /></label>
    {risky && <SafetyWarning checked={acknowledge} change={setAcknowledge} />}
    <p id="offer-help" className="ws-deal-muted">Valid for {rules.offers.validityHours} hours. If accepted, you agree to pay the seller’s WorldStore payment request within {rules.offers.payWindowHours} hours. Delivery is agreed in chat before payment.</p>
    <button className={buttonClass({ size: "sm" })} disabled={left === 0 || (risky && !acknowledge)}>Send offer</button>
  </form>;
}
export function SafetyWarning({ checked, change }: { checked: boolean; change: (checked: boolean) => void }) {
  return <div className="ws-deal-warning" role="status">
    <p>This message may move your conversation or payment outside WorldStore.</p>
    <label><input type="checkbox" checked={checked} onChange={(e) => change(e.target.checked)} /> I understand; send this message anyway</label>
  </div>;
}
