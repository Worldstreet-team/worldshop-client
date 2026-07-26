import { api } from './api';
import type { ApiResponse } from '@/types/common.types';

/**
 * Buyer–vendor chat.
 *
 * Contact happens here first: sales move off-platform, but the conversation is
 * what the marketplace actually provides. It also feeds three things a vendor
 * can see — inquiry counts, response rate, and whether a review is verified.
 */

export type SenderRole = 'BUYER' | 'VENDOR';
export type ConversationStatus = 'OPEN' | 'ARCHIVED' | 'BLOCKED';

/**
 * Which inbox is being read. A user can be both — an inbox that mixed
 * "things I want to buy" with "customers asking about my stock" is unusable.
 */
export type InboxSide = 'buying' | 'selling';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: SenderRole;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  listingId: string | null;
  storeId: string;
  buyerId: string;
  status: ConversationStatus;
  lastMessageAt: string;
  buyerUnread: number;
  vendorUnread: number;
  vendorFirstReplyAt: string | null;
  /** Resolved for the caller's side, so the UI does not re-derive it. */
  unread: number;
  lastMessage: ChatMessage | null;
  listing: {
    id: string;
    name: string;
    slug: string;
    images: Array<Record<string, unknown>>;
    basePrice: number | null;
    priceType: string;
  } | null;
  store: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    verificationTier: string;
  };
}

export interface ConversationThread extends ConversationSummary {
  messages: ChatMessage[];
  myRole: SenderRole;
}

export interface UnreadSummary {
  buying: number;
  selling: number;
  total: number;
}

export const chatService = {
  list: (params: { side: InboxSide; status?: 'OPEN' | 'ARCHIVED'; page?: number; limit?: number }) =>
    api.get<{
      success: boolean;
      data: ConversationSummary[];
      meta: { unreadTotal: number };
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>('/conversations', params as Record<string, unknown>),

  get: (id: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<ConversationThread>>(`/conversations/${id}`, params as Record<string, unknown>),

  /** Buyers only — a vendor cannot open a thread with someone. */
  start: (data: { listingId: string; message: string }) =>
    api.post<ApiResponse<ConversationThread>>('/conversations', data),

  send: (id: string, body: string) =>
    api.post<ApiResponse<ChatMessage>>(`/conversations/${id}/messages`, { body }),

  markRead: (id: string) => api.post<ApiResponse<{ markedRead: number }>>(`/conversations/${id}/read`),

  archive: (id: string) => api.post<ApiResponse<ConversationSummary>>(`/conversations/${id}/archive`),

  /** Both sides at once, for a single header badge. */
  unread: () => api.get<ApiResponse<UnreadSummary>>('/conversations/unread'),
};

export default chatService;
