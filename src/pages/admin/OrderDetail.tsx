import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { adminService, type AdminOrder, type UpdateOrderStatusData } from '@/services/adminService';
import type { OrderStatus } from '@/types/order.types';
import { useUIStore } from '@/store/uiStore';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const getStatusBadgeClass = (status: OrderStatus): string => {
  switch (status) {
    case 'PAID': return 'badge badge-info';
    case 'PROCESSING': return 'badge badge-warning';
    case 'SHIPPED': return 'badge badge-primary';
    case 'DELIVERED': return 'badge badge-success';
    case 'CANCELLED': return 'badge badge-danger';
    case 'REFUNDED': return 'badge badge-secondary';
    default: return 'badge badge-default';
  }
};

const formatPrice = (price: number) =>
  '₦' + price.toLocaleString('en-NG', { minimumFractionDigits: 0 });

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminService.getOrder(id)
      .then((data) => {
        setOrder(data);
      })
      .catch((err: any) => {
        addToast({ type: 'error', message: err.message || 'Failed to load order' });
        navigate('/admin/orders');
      })
      .finally(() => setLoading(false));
  }, [id, addToast, navigate]);

  const availableTransitions = order ? VALID_TRANSITIONS[order.status] || [] : [];

  const handleUpdateStatus = async () => {
    if (!id || !newStatus || !order) return;
    setUpdating(true);
    try {
      const data: UpdateOrderStatusData = {
        status: newStatus,
        note: statusNote || undefined,
        trackingNumber: trackingNumber || undefined,
      };
      const updated = await adminService.updateOrderStatus(id, data);
      setOrder(updated);
      setNewStatus('');
      setStatusNote('');
      setTrackingNumber('');
      addToast({ type: 'success', message: `Order status updated to ${newStatus}` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-order-detail">
        <div className="page-header">
          <Link to="/admin/orders" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Orders
          </Link>
          <h1>Loading...</h1>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ height: 80, marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="admin-order-detail">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/admin/orders" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Orders
          </Link>
          <h1>Order {order.orderNumber}</h1>
          <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
        </div>
      </div>

      <div className="order-detail-layout">
        <div className="order-main">
          {/* Status Update */}
          {availableTransitions.length > 0 && (
            <section className="detail-section">
              <h2>Update Status</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <select
                    className="filter-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  >
                    <option value="">Select new status...</option>
                    {availableTransitions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {newStatus === 'SHIPPED' && (
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Tracking number (optional)"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      style={{ maxWidth: 250 }}
                    />
                  )}
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Add a note (optional)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
                <div>
                  <button
                    className="btn btn-primary"
                    onClick={handleUpdateStatus}
                    disabled={!newStatus || updating}
                  >
                    {updating ? 'Updating...' : `Update to ${newStatus || '...'}`}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Status Timeline */}
          <section className="detail-section">
            <h2>Order Timeline</h2>
            {order.statusHistory && order.statusHistory.length > 0 ? (
              <div className="status-timeline">
                {[...order.statusHistory].reverse().map((entry) => (
                  <div key={entry.id} className="timeline-item" style={{
                    display: 'flex', gap: '1rem', padding: '0.75rem 0',
                    borderBottom: '1px solid #eee'
                  }}>
                    <span className={getStatusBadgeClass(entry.status)} style={{ minWidth: 100, textAlign: 'center' }}>
                      {entry.status}
                    </span>
                    <div style={{ flex: 1 }}>
                      {entry.note && <p style={{ margin: '0 0 0.25rem' }}>{entry.note}</p>}
                      <small className="text-muted">{formatDateTime(entry.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No status history available.</p>
            )}
          </section>

          {/* Order Items */}
          <section className="detail-section">
            <h2>Order Items ({order.items?.length || 0})</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="product-cell">
                        {item.productImage && (
                          <img src={item.productImage} alt={item.productName} className="product-thumb" />
                        )}
                        <div>
                          <strong>{item.productName}</strong>
                          {item.variantName && <small className="text-muted"> • {item.variantName}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{item.sku || '—'}</td>
                    <td>{formatPrice(item.unitPrice)}</td>
                    <td>{item.quantity}</td>
                    <td><strong>{formatPrice(item.totalPrice)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="order-sidebar">
          {/* Order Summary */}
          <section className="detail-section">
            <h2>Summary</h2>
            <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', color: '#16a34a' }}>
                <span>Discount</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
              <span>Shipping</span>
              <span>{formatPrice(order.shipping)}</span>
            </div>
            {order.couponCode && (
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Coupon</span>
                <span className="badge badge-info">{order.couponCode}</span>
              </div>
            )}
            <div className="summary-row total" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid #333', fontWeight: 'bold', fontSize: '1.1rem' }}>
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </section>

          {/* Payment Info */}
          {order.payment && (
            <section className="detail-section">
              <h2>Payment</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Provider</span>
                  <span>{order.payment.provider}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Status</span>
                  <span className={`badge ${order.payment.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}`}>
                    {order.payment.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Reference</span>
                  <span style={{ fontSize: '0.85rem' }}>{order.payment.reference}</span>
                </div>
                {order.payment.paidAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Paid At</span>
                    <span>{formatDateTime(order.payment.paidAt)}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Shipping Address */}
          {order.shippingAddress && (
            <section className="detail-section">
              <h2>Shipping Address</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                <strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong><br />
                {order.shippingAddress.street}
                {order.shippingAddress.apartment && <>, {order.shippingAddress.apartment}</>}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                {order.shippingAddress.country}
                {order.shippingAddress.postalCode && <> · {order.shippingAddress.postalCode}</>}<br />
                <span className="text-muted">{order.shippingAddress.phone}</span>
              </p>
            </section>
          )}

          {/* Dates */}
          <section className="detail-section">
            <h2>Dates</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Created</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              {order.paidAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Paid</span>
                  <span>{formatDateTime(order.paidAt)}</span>
                </div>
              )}
              {order.shippedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Shipped</span>
                  <span>{formatDateTime(order.shippedAt)}</span>
                </div>
              )}
              {order.deliveredAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Delivered</span>
                  <span>{formatDateTime(order.deliveredAt)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          {order.notes && (
            <section className="detail-section">
              <h2>Customer Notes</h2>
              <p style={{ margin: 0, color: '#666' }}>{order.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
