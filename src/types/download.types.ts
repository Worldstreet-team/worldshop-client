export interface DownloadRecord {
    id: string;
    orderItemId: string;
    userId: string;
    assetId: string;
    downloadCount: number;
    maxDownloads: number;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    asset: {
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
    };
    orderItem?: {
        id: string;
        productName: string;
        productImage?: string | null;
        order?: {
            id: string;
            orderNumber: string;
        };
    };
}

export interface DownloadUrl {
    downloadUrl: string;
    fileName: string;
    expiresAt: string;
    downloadsRemaining: number;
}
