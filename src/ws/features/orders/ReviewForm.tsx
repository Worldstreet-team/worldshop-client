"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { buttonClass } from "@ws/components/ui";
import { dispatchOrder, useOrders } from "./store";
const dimensions = [["overall", "Overall"], ["description", "Accurate description"], ["delivery", "Delivery speed"], ["communication", "Communication"], ["packaging", "Packaging"]] as const;
export function ReviewForm({ id }: { id: string }) {
  const router = useRouter(); const order = useOrders().orders.find((item) => item.id === id); const [error, setError] = useState("");
  if (!order) return <h1>Order not found</h1>;
  if (order.status !== "completed" || order.review) return <section className="ws-order-empty"><h1>{order.review ? "Review already posted" : "Review not available"}</h1><p>{order.review ? "Each verified purchase can be reviewed once." : "You can review this purchase after it is completed."}</p><Link className={buttonClass({ variant: "ghost" })} href={`/orders/${id}`}>Back to order</Link></section>;
  return <form className="ws-order-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { dispatchOrder({ type: "review", id: crypto.randomUUID(), order_id: id, review: { overall: Number(data.get("overall")), description: Number(data.get("description")), delivery: Number(data.get("delivery")), communication: Number(data.get("communication")), packaging: Number(data.get("packaging")), body: String(data.get("body")) } }); router.push(`/orders/${id}`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit review."); } }}><p className="ws-order-eyebrow">Verified purchase</p><h1>Review {order.title}</h1><p>Your item review and seller ratings are shown separately across WorldStore.</p>{error && <p role="alert" className="ws-deal-warning">{error}</p>}{dimensions.map(([name, label]) => <label key={name}>{label}<select name={name} required defaultValue=""><option value="" disabled>Choose 1–5</option>{[5,4,3,2,1].map((score) => <option key={score} value={score}>{score} star{score === 1 ? "" : "s"}</option>)}</select></label>)}<label>Review (optional)<textarea name="body" rows={5} placeholder="What should another buyer know?" /></label><button className={buttonClass({})}>Post review</button></form>;
}
