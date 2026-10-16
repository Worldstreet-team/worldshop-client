import { useSyncExternalStore } from "react";
import { createLocalStore } from "@ws/lib/local-store";
import { emptyAlerts, parseAlerts, type AlertsState } from "./model";

const store = createLocalStore("ws:alerts", emptyAlerts, parseAlerts);
export function useAlerts() { return useSyncExternalStore(store.subscribe, store.get, () => store.initial); }
export const alertsNow = () => store.get();
export function updateAlerts(command: (s: AlertsState) => AlertsState) { store.set(command(store.get())); }
