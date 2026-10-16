"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageIcon } from "@ws/components/icons";
import { buttonClass, tabPanelProps, Tabs } from "@ws/components/ui";
import { formatCurrency, kobo } from "@ws/lib/money";
import { reconcileOrders, useOrders } from "./store";

const active = ["payment_pending", "paid", "preparing", "dispatched", "in_transit", "out_for_delivery", "delivery_failed", "delivered", "disputed"];
const label = (status: string) => status.replaceAll("_", " ");
export function OrdersPage({ serverNow }: { serverNow: number }) {
  const state = useOrders();
  const [tab, setTab] = useState("active");
  const [sync] = useState(() => ({ server: serverNow, client: Date.now() }));
  useEffect(() => reconcileOrders(Date.now() + sync.server - sync.client), [sync]);
  const orders = state.orders.filter((order) => tab === "active" ? active.includes(order.status) : tab === "completed" ? order.status === "completed" : tab === "returns" ? ["returned", "disputed", "refunded"].includes(order.status) : order.status === "cancelled");
  return <div className="ws-orders">
    <header className="ws-orders__head"><div><p className="ws-order-eyebrow">Your purchases</p><h1>Orders</h1><p>Track delivery, see where your money is and get help with a purchase.</p></div></header>
    <Tabs aria-label="Order status" idBase="orders" items={[{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }, { value: "returns", label: "Returns" }]} value={tab} onChange={setTab} />
    <div {...tabPanelProps("orders", tab)}>{orders.length ? <div className="ws-order-list">{orders.map((order) => <article key={order.id} className="ws-order-row">
      <Image src={order.photo} alt="" width={96} height={96} unoptimized />
      <div className="ws-order-row__main"><div className="ws-order-row__top"><span className="ws-order-status">{label(order.status)}</span><span>{order.id}</span></div><h2>{order.title}</h2><p>{order.seller_name} · {formatCurrency(kobo(order.total_minor))}</p><p className="ws-order-muted">{order.eta}</p></div>
      <Link className={buttonClass({ variant: "ghost", size: "sm" })} href={`/orders/${order.id}`}>{order.status === "completed" ? order.review ? "View order" : "Review" : "Track order"}</Link>
    </article>)}</div> : <section className="ws-order-empty"><PackageIcon /><h2>No {tab} orders</h2><p>Orders in this state will appear here.</p><Link className={buttonClass({ variant: "ghost" })} href="/search">Browse listings</Link></section>}</div>
    <p className="ws-order-demo">Demo workspace · These orders and money movements stay on this device.</p>
  </div>;
}
