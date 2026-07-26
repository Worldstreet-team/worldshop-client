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

export type ReportTargetType = 'LISTING' | 'STORE' | 'REVIEW';

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
