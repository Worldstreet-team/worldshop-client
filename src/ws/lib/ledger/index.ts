import { rules } from "@ws/config/marketplace-rules";

export const LEDGER_ACCOUNTS = ["provider_clearing", "escrow_held", "escrow_frozen", "seller_pending", "seller_available", "platform_revenue", "refunds_payable", "tax_payable", "buyer_refunded", "seller_withdrawn"] as const;
export type LedgerAccount = typeof LEDGER_ACCOUNTS[number];
export type LedgerActor = "system" | "user" | "admin";
export type Posting = { id: string; order_id: string; idempotency_key: string; debit_account: LedgerAccount; credit_account: LedgerAccount; amount_minor: number; reason_code: string; actor: LedgerActor; created_at: number };
export type Ledger = { order_id: string; captured_minor: number; postings: readonly Posting[]; receipts: Readonly<Record<string, string>> };
export type PostingInput = Omit<Posting, "id" | "order_id"> & { id?: string };

const validMoney = (value: number) => Number.isSafeInteger(value) && value > 0;
export function createLedger(orderId: string, capturedMinor: number): Ledger {
  if (!orderId || !validMoney(capturedMinor)) throw new Error("A ledger needs an order and a positive integer-kobo capture.");
  return { order_id: orderId, captured_minor: capturedMinor, postings: [], receipts: {} };
}
export function balances(ledger: Ledger): Record<LedgerAccount, number> {
  const result = Object.fromEntries(LEDGER_ACCOUNTS.map((account) => [account, account === "provider_clearing" ? ledger.captured_minor : 0])) as Record<LedgerAccount, number>;
  for (const row of ledger.postings) { result[row.debit_account] -= row.amount_minor; result[row.credit_account] += row.amount_minor; }
  return result;
}
export function assertLedgerInvariant(ledger: Ledger) {
  const values = Object.values(balances(ledger));
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error("Ledger account cannot be negative or fractional.");
  if (values.reduce((sum, value) => sum + value, 0) !== ledger.captured_minor) throw new Error("Ledger balances must equal the captured amount.");
  return true;
}
export function post(ledger: Ledger, input: PostingInput): Ledger {
  if (!validMoney(input.amount_minor)) throw new Error("Posting amount must be positive integer kobo.");
  if (input.debit_account === input.credit_account) throw new Error("Posting accounts must differ.");
  const signature = JSON.stringify(input);
  const old = ledger.receipts[input.idempotency_key];
  if (old) {
    if (old !== signature) throw new Error("This idempotency key was already used for another posting.");
    return ledger;
  }
  if (balances(ledger)[input.debit_account] < input.amount_minor) throw new Error("Ledger account has insufficient funds.");
  const row: Posting = { ...input, id: input.id ?? `${ledger.order_id}:${ledger.postings.length + 1}`, order_id: ledger.order_id };
  const next = { ...ledger, postings: [...ledger.postings, row], receipts: { ...ledger.receipts, [input.idempotency_key]: signature } };
  assertLedgerInvariant(next);
  return next;
}
export function captureToEscrow(ledger: Ledger, key: string, at: number) {
  return post(ledger, { idempotency_key: key, debit_account: "provider_clearing", credit_account: "escrow_held", amount_minor: ledger.captured_minor, reason_code: "payment_captured", actor: "system", created_at: at });
}
/** Fees taken at release (S2 step 7, R-152): final value on the item, payment on item + delivery. */
export function sellerFees(itemMinor: number, deliveryMinor: number) {
  const final_value_minor = Math.floor(itemMinor * rules.fees.finalValuePercent / 100);
  const payment_minor = Math.floor((itemMinor + deliveryMinor) * rules.fees.paymentPercent / 100);
  return { final_value_minor, payment_minor, total_minor: final_value_minor + payment_minor };
}
export function releaseToSeller(ledger: Ledger, itemMinor: number, deliveryMinor: number, key: string, at: number) {
  const gross = itemMinor + deliveryMinor;
  if (!validMoney(gross) || gross > balances(ledger).escrow_held) throw new Error("Release exceeds held escrow.");
  const fee = sellerFees(itemMinor, deliveryMinor).total_minor;
  let next = fee > 0 ? post(ledger, { idempotency_key: `${key}:fee`, debit_account: "escrow_held", credit_account: "platform_revenue", amount_minor: fee, reason_code: "fees_earned", actor: "system", created_at: at }) : ledger;
  next = post(next, { idempotency_key: `${key}:seller`, debit_account: "escrow_held", credit_account: "seller_pending", amount_minor: gross - fee, reason_code: "escrow_released", actor: "system", created_at: at });
  return next;
}
/** R-260: corrections never edit a row; they post the mirror entry, once per posting. */
export function reversePosting(ledger: Ledger, postingId: string, at: number, reason: string) {
  const row = ledger.postings.find((p) => p.id === postingId);
  if (!row) throw new Error("Posting not found.");
  if (row.reason_code.startsWith("reversal")) throw new Error("A reversal can’t itself be reversed. Post a new correction instead.");
  if (ledger.receipts[`${postingId}:reversal`]) throw new Error("This posting has already been reversed.");
  if (reason.trim().length < 10) throw new Error("Give a reason of at least 10 characters.");
  return post(ledger, { idempotency_key: `${postingId}:reversal`, debit_account: row.credit_account, credit_account: row.debit_account, amount_minor: row.amount_minor, reason_code: `reversal:${row.reason_code}`, actor: "admin", created_at: at });
}
export function refundToBuyer(ledger: Ledger, amountMinor: number, key: string, at: number, fail = false) {
  let next = post(ledger, { idempotency_key: `${key}:approved`, debit_account: "escrow_held", credit_account: "refunds_payable", amount_minor: amountMinor, reason_code: "refund_approved", actor: "system", created_at: at });
  if (!fail) next = post(next, { idempotency_key: `${key}:paid`, debit_account: "refunds_payable", credit_account: "buyer_refunded", amount_minor: amountMinor, reason_code: "refund_paid", actor: "system", created_at: at });
  return next;
}
