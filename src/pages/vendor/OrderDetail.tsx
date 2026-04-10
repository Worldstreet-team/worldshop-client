import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { vendorService } from '@/services/vendorService';
import type { Order, OrderStatus } from '@/types/order.types';
import { useUIStore } from '@/store/uiStore';

// Vendor-restricted transitions
const VENDOR_TRANSITIONS: Record<OrderStatus, ('PROCESSING' | 'DELIVERED')[]> = {
  CREATED: [],
  PAID: ['PROCESSING'],
  PROCESSING: ['DELIVERED'],
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

export default function VendorOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<'PROCESSING' | 'DELIVERED' | ''>('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    vendorService.getOrder(id)
      .then((res) => setOrder(res.data.data))
      .catch((err: any) => {
        addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load order' });
        navigate('/vendor/orders');
      })
      .finally(() => setLoading(false));
  }, [id, addToast, navigate]);

  const availableTransitions = order ? VENDOR_TRANSITIONS[order.status] || [] : [];

  const handleUpdateStatus = async () => {
    if (!id || !newStatus || !order) return;
    setUpdating(true);
    try {
      const res = await vendorService.updateOrderStatus(id, {
        status: newStatus,
        note: statusNote || undefined,
      });
      setOrder(res.data.data);
      setNewStatus('');
      setStatusNote('');
      addToast({ type: 'success', message: `Order status updated to ${newStatus}` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="vendor-order-detail">
        <div className="page-header">
          <Link to="/vendor/orders" className="back-link">
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
    <div className="vendor-order-detail">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/vendor/orders" className="back-link">
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
                    onChange={(e) => setNewStatus(e.target.value as typeof newStatus)}
                  >
                    <option value="">Select new status...</option>
                    {availableTransitions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
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
            <div className="summary-row total" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '2px solid #333', fontWeight: 'bold', fontSize: '1.1rem' }}>
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </section>

          {/* Customer Info (name only — no email/phone per spec) */}
          {order.shippingAddress && (
            <section className="detail-section">
              <h2>Customer</h2>
              <p style={{ margin: 0 }}>
                <strong>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</strong>
              </p>
            </section>
          )}

          {/* Shipping Address */}
          {order.shippingAddress && (
            <section className="detail-section">
              <h2>Shipping Address</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {order.shippingAddress.street}
                {order.shippingAddress.apartment && <>, {order.shippingAddress.apartment}</>}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state}<br />
                {order.shippingAddress.country}
                {order.shippingAddress.postalCode && <> {order.shippingAddress.postalCode}</>}
              </p>
            </section>
          )}

          {/* Key Dates */}
          <section className="detail-section">
            <h2>Dates</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Placed</span>
                <span>{formatDateTime(order.createdAt)}</span>
              </div>
              {order.paidAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Paid</span>
                  <span>{formatDateTime(order.paidAt)}</span>
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
        </div>
      </div>
    </div>
  );
}
