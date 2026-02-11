import { api } from './api';
import type { ApiResponse } from '@/types/common.types';
import type { DownloadRecord, DownloadUrl } from '@/types/download.types';

export const downloadService = {
    /** Get all downloads for the current user */
    getMyDownloads: () =>
        api.get<ApiResponse<DownloadRecord[]>>('/downloads'),

    /** Get downloads for a specific order */
    getOrderDownloads: (orderId: string) =>
        api.get<ApiResponse<DownloadRecord[]>>(`/downloads/order/${orderId}`),

    /** Generate a signed download URL (increments download count) */
    generateDownloadUrl: (downloadId: string) =>
        api.post<ApiResponse<DownloadUrl>>(`/downloads/${downloadId}/generate`),
};
