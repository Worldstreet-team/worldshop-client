"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckShieldIcon, ClockIcon, DeliveryTruckIcon, ReceiptLinesIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { ESCROW, confirmReleaseCopy } from "@ws/lib/copy/escrow";
import { formatCurrency, kobo } from "@ws/lib/money";
import { rules } from "@ws/config/marketplace-rules";
import { remainingFromServer, type Order } from "./model";
import { dispatchOrder, useOrders } from "./store";

const statusLabel = (value: string) => value.replaceAll("_", " ");
function Countdown({ deadline, sync, onExpire }: { deadline: number; sync: { server: number; client: number }; onExpire: () => void }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const expire = useRef(onExpire); const fired = useRef(false);
  useEffect(() => { expire.current = onExpire; }, [onExpire]);
  useEffect(() => { const tick = () => { const next = remainingFromServer(deadline, sync.server, sync.client, Date.now()); setRemaining(next); if (next === 0 && !fired.current) { fired.current = true; expire.current(); } }; tick(); const id = window.setInterval(tick, 1_000); return () => window.clearInterval(id); }, [deadline, sync]);
  if (remaining === null) return <span>Calculating…</span>;
  const hours = Math.floor(remaining / 3_600_000); const minutes = Math.floor(remaining % 3_600_000 / 60_000); const seconds = Math.floor(remaining % 60_000 / 1_000);
  return <span data-remaining-ms={remaining}>{remaining ? remaining < 5 * 60_000 ? `${minutes}m ${seconds}s remaining` : `${hours}h ${minutes}m remaining` : "Inspection window ended"}</span>;
}
function escrowView(order: Order) {
  const amount = formatCurrency(kobo(order.total_minor));
  switch (order.escrow_status) {
    case "awaiting_payment": return { title: "Confirming payment", body: ESCROW.orderPaymentPending };
    case "held": return order.status === "delivered" ? { title: "Check your item", body: ESCROW.orderHeld } : { title: `${amount} held safely`, body: ESCROW.orderInTransit };
    case "release_eligible": return { title: "Release ready", body: ESCROW.orderHeld };
    case "frozen": case "partial_split": return { title: "Under review", body: ESCROW.orderFrozen };
    case "cancelled_refunding": case "refunding": return { title: "Refund in progress", body: ESCROW.orderRefunding };
    case "refund_failed": return { title: "Refund needs action", body: ESCROW.orderRefundFailed };
    case "refunded": return { title: `${amount} refunded`, body: ESCROW.orderRefunded };
    case "seller_pending": case "seller_available": case "withdrawn": return { title: "Paid to seller", body: ESCROW.orderReleased };
    case "closed": return { title: "Payment closed", body: ESCROW.orderClosed };
  }
}
const dateTime = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: rules.time.zone });
function ReleaseDialog({ total, close, release }: { total: string; close: () => void; release: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) dialog.showModal(); }, []);
  return <dialog ref={ref} className="ws-order-dialog" aria-labelledby="confirm-release-title" onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}><div><h2 id="confirm-release-title">Confirm receipt</h2><p>{confirmReleaseCopy(total)}</p><div className="ws-order-actions"><button className={buttonClass({})} onClick={release}>Release payment</button><button className={buttonClass({ variant: "ghost" })} onClick={close}>Not yet</button></div></div></dialog>;
}

export function OrderDetail({ id, serverNow }: { id: string; serverNow: number }) {
  const state = useOrders(); const order = state.orders.find((item) => item.id === id);
  const [confirming, setConfirming] = useState(false); const [error, setError] = useState("");
  const [sync] = useState(() => ({ server: serverNow, client: Date.now() }));
  if (!order) return <section className="ws-order-empty"><h1>Order not found</h1><Link className={buttonClass({ variant: "ghost" })} href="/orders">All orders</Link></section>;
  const run = (command: Parameters<typeof dispatchOrder>[0], done?: () => void) => { setError(""); try { dispatchOrder(command, Date.now() + sync.server - sync.client); done?.(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update this order."); } };
  const escrow = escrowView(order);
  return <div className="ws-order-detail">
    <div className="ws-order-back"><Link href="/orders">← All orders</Link><span>{order.id}</span></div>
    <header className="ws-order-title"><div><p className="ws-order-eyebrow">{order.seller_name}</p><h1>{order.title}</h1><p>{statusLabel(order.status)} · {order.eta}</p></div><Image src={order.photo} alt="" width={112} height={112} unoptimized /></header>
    {error && <p className="ws-deal-warning" role="alert">{error}</p>}
    <div className="ws-order-columns"><main className="ws-order-main">
      <section className="ws-order-card"><h2>Order progress</h2><ol className="ws-order-timeline">{order.events.map((event, index) => <li key={`${event.status}:${event.at}`} data-current={index === order.events.length - 1}><span /><div><strong>{event.label}</strong><time dateTime={new Date(event.at).toISOString()}>{dateTime.format(event.at)}</time></div></li>)}</ol></section>
      <section className="ws-order-card"><div className="ws-order-card__title"><DeliveryTruckIcon /><div><h2>Delivery</h2><p>{order.courier} · {order.tracking_code}</p></div></div><dl className="ws-order-facts"><div><dt>Status</dt><dd>{order.eta}</dd></div><div><dt>Courier relay</dt><dd>{order.relay_phone}</dd></div><div><dt>Handover PIN</dt><dd><strong className="ws-order-pin">{order.delivery_pin}</strong></dd></div></dl><p className="ws-order-muted">Share the PIN only when the item is in your hands.</p></section>
      <section className="ws-order-card"><div className="ws-order-card__title"><ReceiptLinesIcon /><div><h2>Receipt</h2><p>Payment request agreed in chat</p></div></div><dl className="ws-order-costs"><div><dt>{formatCurrency(kobo(order.unit_minor))} × {order.qty}</dt><dd>{formatCurrency(kobo(order.unit_minor * order.qty))}</dd></div><div><dt>Delivery</dt><dd>{formatCurrency(kobo(order.delivery_minor))}</dd></div><div><dt>Total paid</dt><dd>{formatCurrency(kobo(order.total_minor))}</dd></div></dl></section>
    </main><aside className="ws-order-side">
      <section className="ws-order-card ws-order-escrow"><div className="ws-order-card__title"><CheckShieldIcon /><div><p className="ws-order-eyebrow">Where your money is</p><div className="ws-order-live" role="status" aria-live="polite" aria-atomic="true"><h2>{escrow.title}</h2><p>{escrow.body}</p></div></div></div>{order.inspection_deadline && order.status === "delivered" && <div className="ws-order-countdown"><ClockIcon /><Countdown deadline={order.inspection_deadline} sync={sync} onExpire={() => run({ type: "auto_release", id: `${order.id}:auto-release:${order.inspection_deadline}`, order_id: order.id })} /></div>}
        {order.status === "delivered" && !order.dispute && <div className="ws-order-actions"><button className={buttonClass({ size: "sm" })} onClick={() => setConfirming(true)}>Everything’s fine</button>{!order.inspection_extended && <button className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => run({ type: "extend", id: crypto.randomUUID(), order_id: order.id })}>Add {rules.escrow.extensionHours} hours</button>}<Link className={buttonClass({ variant: "quiet", size: "sm" })} href={`/orders/${order.id}/problem`}>Report a problem</Link></div>}
        {order.status === "completed" && !order.review && <Link className={buttonClass({ size: "sm" })} href={`/orders/${order.id}/review`}>Write a review</Link>}
        {order.review && <div className="ws-order-review"><strong>Your review · {order.review.overall}/5</strong>{order.review.body && <p>{order.review.body}</p>}</div>}
        {order.dispute && <div className="ws-order-case"><strong>Case {order.dispute.id.slice(0, 8)}</strong><span>{statusLabel(order.dispute.status)}</span>{order.dispute.decision ? <p className="ws-order-ruling"><strong>WorldStore’s decision</strong> {order.dispute.decision.rationale}</p> : <p>Seller response due {dateTime.format(order.dispute.seller_due_at)}</p>}{order.dispute.info_requests?.map((r) => <p key={r.at}><strong>WorldStore asked</strong> {r.note}</p>)}{order.escrow_status === "frozen" && <div className="ws-order-actions"><button className={buttonClass({ variant: "ghost", size: "sm" })} onClick={() => run({ type: "refund", id: crypto.randomUUID(), order_id: order.id, outcome: "success" })}>Simulate refund</button><button className={buttonClass({ variant: "quiet", size: "sm" })} onClick={() => run({ type: "refund", id: crypto.randomUUID(), order_id: order.id, outcome: "failed" })}>Simulate refund failure</button></div>}{order.escrow_status === "refund_failed" && <button className={buttonClass({ size: "sm" })} onClick={() => run({ type: "wallet_credit", id: crypto.randomUUID(), order_id: order.id })}>Recover to WorldStore balance</button>}</div>}
        <Link href="/help/escrow">How escrow works</Link>
      </section>
      <section className="ws-order-card"><h2>Money timeline</h2><ol className="ws-money-timeline">{order.ledger.postings.map((row) => <li key={row.id}><span>{row.reason_code.replaceAll("_", " ")}</span><strong>{formatCurrency(kobo(row.amount_minor))}</strong></li>)}</ol></section>
    </aside></div>
    {confirming && <ReleaseDialog total={formatCurrency(kobo(order.total_minor))} close={() => setConfirming(false)} release={() => run({ type: "confirm", id: crypto.randomUUID(), order_id: order.id }, () => setConfirming(false))} />}
  </div>;
}
