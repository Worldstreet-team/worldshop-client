export interface DownloadRecord {
    id: string;
    orderItemId: string;
    assetId: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    productName: string;
    productSlug: string;
    downloadCount: number;
    maxDownloads: number;
    remainingDownloads: number;
    expiresAt: string;
    isExpired: boolean;
    canDownload: boolean;
    createdAt: string;
}

export interface DownloadUrl {
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
    downloadsRemaining: number;
}
