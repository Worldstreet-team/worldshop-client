"use client";
import Link from "next/link";
import { ArrowRightIcon, PackageIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { rules } from "@ws/config/marketplace-rules";
import { useOrders } from "./store";

export function ReturnInstructions({ id }: { id: string }) {
  const order = useOrders().orders.find((item) => item.id === id);
  if (!order) return <section className="ws-order-empty"><h1>Order not found</h1><Link className={buttonClass({ variant: "ghost" })} href="/orders">All orders</Link></section>;
  return <article className="ws-order-form ws-return"><p className="ws-order-eyebrow">Return for refund</p><h1>Return {order.title}</h1><p>A return starts with a problem report so the seller can accept it and WorldStore can keep the money state accurate.</p><ol><li><PackageIcon /><div><strong>Open a case</strong><p>Choose Return for refund and add the requested evidence.</p></div></li><li><span>2</span><div><strong>Wait for instructions</strong><p>The seller has {rules.disputes.sellerResponseHours} hours to respond. Do not ship before the case shows an approved address or label.</p></div></li><li><span>3</span><div><strong>Ship on time</strong><p>After approval, send the item within {rules.disputes.returnShipDays} days and keep the courier receipt.</p></div></li></ol><Link className={buttonClass({ arrow: true })} href={`/orders/${id}/problem`}>Start problem report<ArrowRightIcon /></Link><Link href={`/orders/${id}`}>Back to order</Link></article>;
}
