"use client";
import { useEffect, useSyncExternalStore } from "react";
import { createLocalStore } from "@ws/lib/local-store";
import { rules } from "@ws/config/marketplace-rules";
import { emptyState, execute, expire, parseState, type Command, type Context } from "./model";

const store = createLocalStore("ws:p2p:v1", emptyState, parseState, { requirePersistence: true });
export function useNegotiations() {
  const value = useSyncExternalStore(store.subscribe, store.get, () => store.initial);
  useEffect(() => {
    const refresh = () => { const old = store.get(); const current = expire(old, Date.now()); if (old !== current) { try { store.set(current); } catch { /* Commands still enforce deadlines when persistence is unavailable. */ } } };
    refresh();
    const timer = window.setInterval(refresh, rules.offers.refreshMs);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return value;
}
export function dispatch(command: Command, context: Context) { store.set(execute(store.get(), command, context)); }

const drafts = createLocalStore<Record<string, string>>("ws:p2p:drafts", {}, (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string" && v.length <= rules.messaging.maxChars));
});
export function useDraft(id: string): [string, (value: string) => void] {
  const values = useSyncExternalStore(drafts.subscribe, drafts.get, () => drafts.initial);
  return [values[id] ?? "", (value) => drafts.set({ ...drafts.get(), [id]: value })];
}
