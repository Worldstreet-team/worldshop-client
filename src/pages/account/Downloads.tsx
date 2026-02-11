import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { downloadService } from '@/services/downloadService';
import { useUIStore } from '@/store/uiStore';
import type { DownloadRecord } from '@/types/download.types';

export default function DownloadsPage() {
    const { addToast } = useUIStore();
    const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        downloadService.getMyDownloads()
            .then(res => setDownloads(res.data || []))
            .catch(() => addToast({ message: 'Failed to load downloads', type: 'error' }))
            .finally(() => setIsLoading(false));
    }, [addToast]);

    const handleDownload = async (downloadId: string) => {
        setDownloadingId(downloadId);
        try {
            const res = await downloadService.generateDownloadUrl(downloadId);
            window.open(res.data.downloadUrl, '_blank');
            // Refresh to update download counts
            const updated = await downloadService.getMyDownloads();
            setDownloads(updated.data || []);
        } catch (err: any) {
            addToast({ message: err.message || 'Download failed', type: 'error' });
        } finally {
            setDownloadingId(null);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

    if (isLoading) {
        return (
            <div className="downloads-page">
                <div className="container">
                    <div className="page-header">
                        <Link to="/account" className="back-link">
                            <span className="material-icons">arrow_back</span>
                            Back to Account
                        </Link>
                        <h1>My Downloads</h1>
                    </div>
                    <div className="downloads-skeleton">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton-line w-200" />
                                <div className="skeleton-line w-150" style={{ marginTop: 8 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="downloads-page">
            <div className="container">
                <div className="page-header">
                    <Link to="/account" className="back-link">
                        <span className="material-icons">arrow_back</span>
                        Back to Account
                    </Link>
                    <h1>My Downloads</h1>
                </div>

                {downloads.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-icons" style={{ fontSize: 48, color: 'var(--color-text-muted)' }}>cloud_download</span>
                        <h3>No downloads yet</h3>
                        <p>Digital products you purchase will appear here for download.</p>
                        <Link to="/products" className="btn btn-primary">Browse Products</Link>
                    </div>
                ) : (
                    <div className="downloads-list-page">
                        {downloads.map((dl) => (
                            <div key={dl.id} className="download-card">
                                <div className="download-card-icon">
                                    <span className="material-icons">description</span>
                                </div>
                                <div className="download-card-info">
                                    <h4 className="download-card-filename">{dl.asset.fileName}</h4>
                                    <div className="download-card-meta">
                                        <span>{formatFileSize(dl.asset.fileSize)}</span>
                                        <span>&middot;</span>
                                        <span>{dl.asset.mimeType}</span>
                                        {dl.orderItem?.order && (
                                            <>
                                                <span>&middot;</span>
                                                <Link to={`/account/orders/${dl.orderItem.order.id}`}>
                                                    Order #{dl.orderItem.order.orderNumber}
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                    <div className="download-card-status">
                                        <span>{dl.downloadCount}/{dl.maxDownloads} downloads used</span>
                                        <span>&middot;</span>
                                        <span>Expires {formatDate(dl.expiresAt)}</span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleDownload(dl.id)}
                                    disabled={downloadingId === dl.id || dl.downloadCount >= dl.maxDownloads || new Date(dl.expiresAt) < new Date()}
                                >
                                    {downloadingId === dl.id
                                        ? 'Generating...'
                                        : dl.downloadCount >= dl.maxDownloads
                                            ? 'Limit Reached'
                                            : new Date(dl.expiresAt) < new Date()
                                                ? 'Expired'
                                                : 'Download'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
