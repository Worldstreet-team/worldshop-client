import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { downloadService } from '@/services/downloadService';
import { useUIStore } from '@/store/uiStore';
import type { Order } from '@/types/order.types';
import type { DownloadRecord } from '@/types/download.types';

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Pending',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const STATUS_CLASS: Record<string, string> = {
  CREATED: 'status-created',
  PAID: 'status-paid',
  PROCESSING: 'status-processing',
  SHIPPED: 'status-shipped',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
  REFUNDED: 'status-refunded',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useUIStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await orderService.getOrderById(id);
        setOrder(response.data);
      } catch (err) {
        setError('Failed to load order details');
        console.error('Error fetching order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Fetch downloads for this order
  useEffect(() => {
    if (!id || !order || !['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) return;
    downloadService.getOrderDownloads(id)
      .then(res => setDownloads(res.data || []))
      .catch(() => { /* no downloads */ });
  }, [id, order?.status]);

  const handleDownload = async (downloadId: string) => {
    setDownloadingId(downloadId);
    try {
      const res = await downloadService.generateDownloadUrl(downloadId);
      window.open(res.data.downloadUrl, '_blank');
      // Refresh download records to update count
      if (id) {
        const updated = await downloadService.getOrderDownloads(id);
        setDownloads(updated.data || []);
      }
    } catch (err: any) {
      addToast({ message: err.message || 'Download failed', type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const canCancel = (status: string) => status === 'CREATED';

  const handleCancelOrder = async () => {
    if (!order || !canCancel(order.status)) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setIsCancelling(true);
    try {
      const response = await orderService.cancelOrder(order.id, 'Cancelled by customer');
      setOrder(response.data);
      addToast({ message: 'Order cancelled successfully', type: 'success' });
    } catch (err) {
      addToast({ message: 'Failed to cancel order', type: 'error' });
      console.error('Error cancelling order:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // ----- Loading Skeleton -----
  if (isLoading) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="page-header">
            <Link to="/account/orders" className="back-link">
              <span className="material-icons">arrow_back</span>
              Back to Orders
            </Link>
            <h1>Order Details</h1>
          </div>
          <div className="detail-skeleton">
            <div className="skeleton-header">
              <div>
                <div className="skeleton-line w-200 h-20" />
                <div className="skeleton-line w-150" style={{ marginTop: 8 }} />
              </div>
              <div className="skeleton-line w-80" />
            </div>
            <div className="skeleton-grid">
              <div>
                <div className="skeleton-section">
                  <div className="skeleton-section-title">
                    <div className="skeleton-line w-120" />
                  </div>
                  <div className="skeleton-section-body">
                    {[1, 2].map((i) => (
                      <div key={i} className="skeleton-item-row">
                        <div className="skeleton-line h-64" />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton-line w-200" />
                          <div className="skeleton-line w-100" />
                        </div>
                        <div className="skeleton-line w-80" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="skeleton-section">
                  <div className="skeleton-section-title">
                    <div className="skeleton-line w-120" />
                  </div>
                  <div className="skeleton-section-body">
                    <div className="skeleton-line w-full" />
                    <div className="skeleton-line w-full" />
                    <div className="skeleton-line w-150" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----- Error -----
  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="page-header">
            <Link to="/account/orders" className="back-link">
              <span className="material-icons">arrow_back</span>
              Back to Orders
            </Link>
            <h1>Order Details</h1>
          </div>
          <div className="detail-error">
            <span className="material-icons error-icon">error_outline</span>
            <p>{error || 'Order not found'}</p>
            <Link to="/account/orders" className="btn-back">Back to Orders</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <Link to="/account/orders" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Orders
          </Link>
          <h1>Order Details</h1>
        </div>

        {/* Order Info Header */}
        <div className="order-info-header">
          <div className="info-left">
            <h2>Order #{order.orderNumber}</h2>
            <div className="order-meta">
              <span className="meta-item">
                <span className="material-icons">calendar_today</span>
                {formatDate(order.createdAt)}
              </span>
              <span className="meta-item">
                <span className="material-icons">inventory_2</span>
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </span>
              {order.paidAt && (
                <span className="meta-item">
                  <span className="material-icons">payments</span>
                  Paid {formatDate(order.paidAt)}
                </span>
              )}
            </div>
          </div>
          <div className="info-right">
            <span className={STATUS_CLASS[order.status] || 'status-default'}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
            {canCancel(order.status) && (
              <button
                className="btn-cancel"
                onClick={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>

        {/* Two-column grid: items on left, sidebar on right */}
        <div className="order-detail-grid">
          {/* Main content */}
          <div className="order-main">
            {/* Items */}
            <div className="section-card">
              <h3 className="section-title">
                <span className="material-icons">shopping_bag</span>
                Order Items ({order.items.length})
              </h3>
              <div className="section-body" style={{ padding: 0 }}>
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="item-product">
                            <div className="item-image">
                              <img
                                src={item.productImage || '/images/products/placeholder.jpg'}
                                alt={item.productName}
                              />
                            </div>
                            <div className="item-details">
                              <p className="item-name">{item.productName}</p>
                              {item.sku && <p className="item-sku">SKU: {item.sku}</p>}
                              {item.variantName && (
                                <p className="item-variant">{item.variantName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="item-price">₦{item.unitPrice.toLocaleString()}</td>
                        <td className="item-qty">{item.quantity}</td>
                        <td className="item-total">₦{item.totalPrice.toLocaleString()}</td>

                        {/* Mobile row (hidden on desktop via CSS) */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Digital Downloads */}
            {downloads.length > 0 && (
              <div className="section-card">
                <h3 className="section-title">
                  <span className="material-icons">download</span>
                  Digital Downloads
                </h3>
                <div className="section-body">
                  <div className="downloads-list">
                    {downloads.map((dl) => (
                      <div key={dl.id} className="download-item">
                        <div className="download-info">
                          <span className="material-icons">description</span>
                          <div>
                            <p className="download-filename">{dl.fileName}</p>
                            <p className="download-meta">
                              {(dl.fileSize / 1024 / 1024).toFixed(1)} MB
                              &middot; {dl.downloadCount}/{dl.maxDownloads} downloads used
                            </p>
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleDownload(dl.id)}
                          disabled={downloadingId === dl.id || !dl.canDownload}
                        >
                          {downloadingId === dl.id
                            ? 'Generating...'
                            : !dl.canDownload
                              ? (dl.isExpired ? 'Expired' : 'Limit Reached')
                              : 'Download'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Order Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="section-card">
                <h3 className="section-title">
                  <span className="material-icons">timeline</span>
                  Order Timeline
                </h3>
                <div className="section-body">
                  <div className="order-timeline">
                    {order.statusHistory.map((history, index) => (
                      <div
                        key={history.id}
                        className={`timeline-step ${index === 0 ? 'current' : 'completed'}`}
                      >
                        <div className="timeline-marker" />
                        <div className="timeline-content">
                          <span className="timeline-status">
                            {STATUS_LABELS[history.status] || history.status}
                          </span>
                          <span className="timeline-date">{formatDateTime(history.createdAt)}</span>
                          {history.note && (
                            <p className="timeline-note">{history.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="order-sidebar">
            {/* Order Summary */}
            <div className="section-card order-summary-card">
              <h3 className="section-title">
                <span className="material-icons">receipt_long</span>
                Order Summary
              </h3>
              <div className="section-body">
                <div className="summary-rows">
                  <div className="summary-row">
                    <span className="label">Subtotal</span>
                    <span className="value">₦{order.subtotal.toLocaleString()}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="summary-row discount">
                      <span className="label">
                        Discount {order.couponCode && `(${order.couponCode})`}
                      </span>
                      <span className="value">-₦{order.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span className="label">Shipping</span>
                    <span className="value">
                      {order.shipping === 0 ? 'Free' : `₦${order.shipping.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="summary-row total">
                    <span className="label">Total</span>
                    <span className="value">₦{order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress ? (
              <div className="section-card">
                <h3 className="section-title">
                  <span className="material-icons">local_shipping</span>
                  Shipping Address
                </h3>
                <div className="section-body">
                  <div className="address-info">
                    <p className="address-name">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    <p className="address-line">{order.shippingAddress.street}</p>
                    {order.shippingAddress.apartment && (
                      <p className="address-line">{order.shippingAddress.apartment}</p>
                    )}
                    <p className="address-line">
                      {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                      {order.shippingAddress.postalCode}
                    </p>
                    <p className="address-line">{order.shippingAddress.country}</p>
                    <div className="address-phone">
                      <span className="material-icons">phone</span>
                      {order.shippingAddress.phone}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="section-card">
                <h3 className="section-title">
                  <span className="material-icons">cloud_download</span>
                  Digital Delivery
                </h3>
                <div className="section-body">
                  <p>This is a digital order. Products are delivered via email and available for download in your account.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
