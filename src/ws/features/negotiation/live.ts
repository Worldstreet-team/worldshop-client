"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService, type ConversationSummary, type ConversationThread, type InboxSide } from "@/features/chat/api";
import { toApiError } from "@/shared/lib/api";
import { listingPath } from "@ws/lib/data/repo";
import { kobo } from "@ws/lib/money";
import type { DealListing } from "./NegotiationHub";
import type { Message, Role, Thread } from "./model";

/*
 * The inbox over the marketplace's chat API. The reference kept conversations in the
 * browser (model.ts + store.ts); here they are real threads between a buyer and a
 * shop, so the UI's Thread and Message shapes are built from the API's records.
 */

export const sideOf = (role: Role): InboxSide => (role === "buyer" ? "buying" : "selling");

const KEYS = {
  list: (side: InboxSide) => ["ws-chat", "list", side] as const,
  thread: (id: string) => ["ws-chat", "thread", id] as const,
};

export function useConversations(role: Role, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.list(sideOf(role)),
    queryFn: () => chatService.list({ side: sideOf(role), limit: 50 }).then((r) => r.data),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useThread(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.thread(id ?? ""),
    queryFn: () => chatService.get(id as string).then((r) => r.data),
    enabled: enabled && Boolean(id),
    refetchInterval: 15_000,
  });
}

export function toThread(c: ConversationThread): Thread {
  const messages: Message[] = c.messages.map((m) => ({
    id: m.id,
    role: m.senderRole === "VENDOR" ? "seller" : "buyer",
    body: m.body,
    photos: [],
    at: Date.parse(m.createdAt),
    flagged: false,
  }));
  return { id: c.id, seller_id: c.storeId, created_at: messages[0]?.at ?? Date.parse(c.lastMessageAt), messages, reported: false };
}

/** The listing a conversation hangs off, from the thread itself when the live list no longer has it. */
export function listingFromConversation(c: ConversationSummary): DealListing | undefined {
  if (!c.listing) return undefined;
  const photo = (c.listing.images as Array<{ url?: string; key?: string }>)[0];
  const url = photo ? String(photo.url || photo.key || "") : "";
  return {
    id: c.listing.id,
    seller_id: c.store.id,
    price_minor: kobo(Math.round((c.listing.basePrice ?? 0) * 100)),
    qty: 1,
    status: "live",
    category_id: "other",
    title: c.listing.name,
    slug: c.listing.slug,
    shop_name: c.store.name,
    photo: url ? { url, alt: c.listing.name } : undefined,
  };
}

export const threadHref = (id: string) => `/inbox/${id}`;
export const listingHref = (l: Pick<DealListing, "id" | "slug">) => listingPath(l);

/** Sends into an open thread, or starts one from a listing (buyers only). */
export function useSend(onStarted: (conversationId: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, listingId, body }: { conversationId?: string; listingId?: string; body: string }) => {
      if (conversationId) {
        await chatService.send(conversationId, body);
        return conversationId;
      }
      if (!listingId) throw new Error("Choose a conversation first.");
      const started = await chatService.start({ listingId, message: body });
      return started.data.id;
    },
    onSuccess: (id, vars) => {
      void client.invalidateQueries({ queryKey: ["ws-chat"] });
      if (!vars.conversationId) onStarted(id);
    },
  });
}

export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatService.markRead(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["ws-chat", "list"] }),
  });
}

export const errorText = (err: unknown) => toApiError(err, "Your message didn't send. Try again.").message;
