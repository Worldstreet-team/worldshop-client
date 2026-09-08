import { api } from './api';
import type { ApiResponse } from '@/types/common.types';

/**
 * Reports.
 *
 * De-listing is the platform's only enforcement lever now that money moves
 * off-platform, so this is the entire buyer-side contribution to trust and
 * safety. Reporting requires an account: anonymous claims cannot be
 * deduplicated or held to account.
 */

export type ReportTargetType = 'LISTING' | 'STORE' | 'MALL' | 'REVIEW';

export type ReportReason =
  | 'SCAM'
  | 'PROHIBITED'
  | 'MISLEADING'
  | 'MISCATEGORISED'
  | 'DUPLICATE'
  | 'OFFENSIVE'
  | 'FAKE_REVIEW'
  | 'OTHER';

/**
 * Reasons offered per target. The server accepts the full set, but showing
 * "Fake review" on a listing or "Miscategorised" on a store just invites
 * mis-filed reports, and the queue is ranked and filtered by reason.
 */
export const REASONS_BY_TARGET: Record<ReportTargetType, Array<{ value: ReportReason; label: string }>> = {
  LISTING: [
    { value: 'SCAM', label: 'Looks like a scam' },
    { value: 'MISLEADING', label: 'Misleading photos, details or price' },
    { value: 'PROHIBITED', label: 'Illegal or prohibited item' },
    { value: 'MISCATEGORISED', label: 'In the wrong category' },
    { value: 'DUPLICATE', label: 'Duplicate listing' },
    { value: 'OFFENSIVE', label: 'Offensive content' },
    { value: 'OTHER', label: 'Something else' },
  ],
  STORE: [
    { value: 'SCAM', label: 'Looks like a scam seller' },
    { value: 'MISLEADING', label: 'Misrepresenting who they are' },
    { value: 'PROHIBITED', label: 'Selling illegal or prohibited items' },
    { value: 'OFFENSIVE', label: 'Offensive content' },
    { value: 'OTHER', label: 'Something else' },
  ],
  MALL: [
    { value: 'SCAM', label: 'Looks like a scam operation' },
    { value: 'MISLEADING', label: 'Misrepresenting who they are' },
    { value: 'PROHIBITED', label: 'Hosting illegal or prohibited sellers' },
    { value: 'OFFENSIVE', label: 'Offensive content' },
    { value: 'OTHER', label: 'Something else' },
  ],
  REVIEW: [
    { value: 'FAKE_REVIEW', label: 'This review is fake' },
    { value: 'OFFENSIVE', label: 'Abusive or offensive' },
    { value: 'MISLEADING', label: 'Untrue or misleading' },
    { value: 'OTHER', label: 'Something else' },
  ],
};

export interface MyReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  status: 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
  createdAt: string;
}

/** Admin moderation views. All behind the ADMIN role server-side. */
export interface AdminReportStats {
  byStatus: Record<string, number>;
  byTargetType: Record<string, number>;
  openByReason: Record<string, number>;
  openTargets: number;
  mostReported: Array<{
    targetType: ReportTargetType;
    targetId: string;
    label: string;
    reportCount: number;
  }>;
}

/** One row per reported thing, ranked by distinct reporters — the queue an
 *  admin works from. Mirrors the server's QueueEntry. */
export interface AdminQueueEntry {
  targetType: ReportTargetType;
  targetId: string;
  label: string;
  targetStatus: string;
  reportCount: number;
  reasons: ReportReason[];
  firstReportedAt: string;
  lastReportedAt: string;
  reportIds: string[];
}

export type ReportAdminAction =
  | 'REMOVE_LISTING'
  | 'SUSPEND_STORE'
  | 'BAN_STORE'
  | 'SUSPEND_MALL'
  | 'BAN_MALL'
  | 'REMOVE_REVIEW';

/** Actions an admin can take per target type; the server enforces the same map. */
export const ACTIONS_BY_TARGET: Record<ReportTargetType, Array<{ value: ReportAdminAction; label: string }>> = {
  LISTING: [{ value: 'REMOVE_LISTING', label: 'Remove listing' }],
  STORE: [
    { value: 'SUSPEND_STORE', label: 'Suspend store' },
    { value: 'BAN_STORE', label: 'Ban store' },
  ],
  MALL: [
    { value: 'SUSPEND_MALL', label: 'Suspend mall' },
    { value: 'BAN_MALL', label: 'Ban mall' },
  ],
  REVIEW: [{ value: 'REMOVE_REVIEW', label: 'Remove review' }],
};

export const adminReportService = {
  stats: () => api.get<ApiResponse<AdminReportStats>>('/admin/reports/stats'),

  queue: (targetType?: ReportTargetType) =>
    api.get<{ success: boolean; data: AdminQueueEntry[]; meta: { openTargets: number } }>(
      '/admin/reports/queue',
      targetType ? { targetType } : undefined,
    ),

  // Acting on any one report closes every open report on the same target.
  action: (reportId: string, action: ReportAdminAction, note?: string) =>
    api.post<ApiResponse<{ reportsClosed: number }>>(`/admin/reports/${reportId}/action`, { action, note }),

  dismiss: (reportId: string, note?: string) =>
    api.post<ApiResponse<{ dismissed: number }>>(`/admin/reports/${reportId}/dismiss`, { note }),
};

export const reportService = {
  create: (data: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
  }) => api.post<ApiResponse<{ id: string; status: string }>>('/reports', data),

  mine: (params?: { page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: MyReport[]; pagination: { total: number; totalPages: number } }>(
      '/reports/mine',
      params as Record<string, unknown>,
    ),
};

export default reportService;
