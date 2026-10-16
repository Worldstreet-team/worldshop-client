"use client";
import { useSyncExternalStore } from "react";
import { createLocalStore } from "@ws/lib/local-store";
import { executeOrder, initialState, parseOrdersState, reconcileExpiredOrders, type OrderCommand } from "./model";
const store = createLocalStore("ws:orders:v1", initialState, parseOrdersState, {
  requirePersistence: true,
  persistenceError: "Could not save this order update on this device. Browser storage may be full or blocked. Free space, then retry; the order has not changed.",
});
export function useOrders() { return useSyncExternalStore(store.subscribe, store.get, () => store.initial); }
export function dispatchOrder(command: OrderCommand, now = Date.now()) { store.set(executeOrder(store.get(), command, now)); }
export function reconcileOrders(now: number) { const current = store.get(); const next = reconcileExpiredOrders(current, now); if (next !== current) store.set(next); }
