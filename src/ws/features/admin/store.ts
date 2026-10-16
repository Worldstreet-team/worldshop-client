"use client";
import { useSyncExternalStore } from "react";
import { createLocalStore } from "@ws/lib/local-store";
import { audit, initialAdmin, parseAdmin, type AdminState, type AuditEntry } from "./model";

const store = createLocalStore("ws:admin:v1", initialAdmin, parseAdmin, {
  requirePersistence: true,
  persistenceError: "Couldn’t save on this device. Browser storage may be full or blocked; nothing was changed.",
});
export function useAdmin() { return useSyncExternalStore(store.subscribe, store.get, () => store.initial); }
export function updateAdmin(command: (state: AdminState) => AdminState) { store.set(command(store.get())); }
/** Records an audit entry for an action that already succeeded. */
export function logAction(entry: Omit<AuditEntry, "id" | "staff" | "role" | "at">) { updateAdmin((s) => audit(s, { ...entry, at: Date.now() })); }
