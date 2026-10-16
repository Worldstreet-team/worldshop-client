import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";
import { chatService, type ConversationSummary } from "@/features/chat/api";
import { useSession } from "@ws/features/auth/session";
import { useConversations } from "@ws/features/negotiation/live";
import { createLocalStore } from "@ws/lib/local-store";

/*
 * Notifications (SCR-017). The bell's count is the number of unread items in the panel,
 * read from the same list, so the two can't disagree (flows Part H guardrail: badge
 * counts equal panel contents; audit F5).
 *
 * Two sources: saved-search and price alerts, which the browser computes and keeps
 * (AlertsWatcher), and conversations with unread messages, which come from the chat
 * API on the inbox's own queries. A message notice is the thread itself, so it clears
 * when the thread is read, here or on any other device.
 */

export type Notice = { id: string; title: string; body?: string; href: string; at: string; read: boolean };

const store = createLocalStore<readonly Notice[]>("ws:notifications", [], (raw) =>
  Array.isArray(raw)
    ? raw.filter((n): n is Notice => typeof n === "object" && n !== null && typeof n.id === "string" && typeof n.title === "string" && typeof n.href === "string")
    : [],
);

function messageNotice(c: ConversationSummary, side: "buyer" | "seller"): Notice {
  const who = side === "buyer" ? c.store.name : (c.buyer?.name ?? "A buyer");
  return {
    id: `chat:${c.id}`,
    title: side === "buyer" ? `${who} replied` : `${who} messaged you`,
    body: [c.listing?.name, c.lastMessage?.body].filter(Boolean).join(": "),
    href: `/inbox/${c.id}`,
    at: c.lastMessage?.createdAt ?? c.lastMessageAt,
    read: false,
  };
}

export function useNotices(): readonly Notice[] {
  const local = useSyncExternalStore(store.subscribe, store.get, () => store.initial);
  const { signedIn } = useSession();
  const buying = useConversations("buyer", signedIn).data;
  const selling = useConversations("seller", signedIn).data;
  return useMemo(() => {
    const chats = [...(buying ?? []).filter((c) => c.unread > 0).map((c) => messageNotice(c, "buyer")), ...(selling ?? []).filter((c) => c.unread > 0).map((c) => messageNotice(c, "seller"))];
    return [...chats, ...local].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [buying, selling, local]);
}

/** Marks the alerts read here and each unread conversation read on the server. */
export function useMarkAllRead(notices: readonly Notice[]) {
  const client = useQueryClient();
  return () => {
    markAllRead();
    const threads = notices.filter((n) => n.id.startsWith("chat:")).map((n) => n.id.slice(5));
    if (threads.length) void Promise.allSettled(threads.map((id) => chatService.markRead(id))).then(() => client.invalidateQueries({ queryKey: ["ws-chat"] }));
  };
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
