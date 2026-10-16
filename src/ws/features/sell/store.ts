"use client";
import { useSyncExternalStore } from "react";
import { createLocalStore } from "@ws/lib/local-store";
import { initialAccount, parseAccount, type SellerAccount } from "./model";

const store = createLocalStore("ws:seller:v1", initialAccount, parseAccount, {
  requirePersistence: true,
  persistenceError: "Couldn’t save on this device. Browser storage may be full or blocked: remove a photo or free space, then try again. Nothing was lost on this screen.",
});
export function useSeller() { return useSyncExternalStore(store.subscribe, store.get, () => store.initial); }
/** Applies a model command; throws (with the model's or storage's message) and leaves the account unchanged on failure. */
export function updateSeller(command: (account: SellerAccount) => SellerAccount) { store.set(command(store.get())); }
const noop = () => () => {};
/** False on the server and the first client render, so device-local state can't flash a wrong screen. */
export function useHydrated() { return useSyncExternalStore(noop, () => true, () => false); }
