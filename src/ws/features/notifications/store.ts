import { useSyncExternalStore } from "react";
import { createLocalStore } from "@ws/lib/local-store";

/*
 * Notifications (SCR-017). The bell's count is the number of unread items in the panel,
 * read from the same list, so the two can't disagree (flows Part H guardrail: badge
 * counts equal panel contents; audit F5). Nothing produces notifications until offers,
 * messages and orders exist (Phases 4–6), so the list starts empty.
 */

export type Notice = { id: string; title: string; body?: string; href: string; at: string; read: boolean };

const store = createLocalStore<readonly Notice[]>("ws:notifications", [], (raw) =>
  Array.isArray(raw)
    ? raw.filter((n): n is Notice => typeof n === "object" && n !== null && typeof n.id === "string" && typeof n.title === "string" && typeof n.href === "string")
    : [],
);

export function useNotices() {
  return useSyncExternalStore(store.subscribe, store.get, () => store.initial);
}

export function unreadCount(list: readonly Notice[]) {
  return list.filter((n) => !n.read).length;
}

export function markAllRead() {
  store.set(store.get().map((n) => ({ ...n, read: true })));
}

/** For later phases (and tests): add a notice to the top of the list. */
export function pushNotice(notice: Notice) {
  store.set([notice, ...store.get().filter((n) => n.id !== notice.id)]);
}
