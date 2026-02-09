import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import { useUIStore } from '@/store/uiStore';
import type { Order } from '@/types/order.types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useUIStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      CREATED: 'status-pending',
      PAID: 'status-paid',
      PROCESSING: 'status-processing',
      SHIPPED: 'status-shipped',
      DELIVERED: 'status-delivered',
      CANCELLED: 'status-cancelled',
      REFUNDED: 'status-refunded',
    };
    return statusMap[status] || 'status-default';
  };

  const canCancel = (status: string) => {
    return status === 'CREATED';
  };

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

  if (isLoading) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="loading-spinner">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="error-message">{error || 'Order not found'}</div>
          <Link to="/account/orders" className="btn btn-primary">Back to Orders</Link>
        </div>
      </div>
    );
  }

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

        <div className="order-detail-content">
          <div className="order-info-card">
            <div className="order-info-header">
              <div>
                <h2>Order #{order.orderNumber}</h2>
                <div className="order-meta">
                  <span>Placed on: {formatDate(order.createdAt)}</span>
                </div>
              </div>
              <span className={`order-status ${getStatusClass(order.status)}`}>
                {order.status}
              </span>
            </div>
            {canCancel(order.status) && (
              <button
                className="btn btn-outline-danger"
                onClick={handleCancelOrder}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>

          <div className="order-sections">
            <section className="order-items-section">
              <h3>Order Items ({order.items.length})</h3>
              <div className="order-items-list">
                {order.items.map((item) => (
                  <div key={item.id} className="order-item">
                    <div className="item-image">
                      <img
                        src={item.productImage || '/placeholder.jpg'}
                        alt={item.productName}
                      />
                    </div>
                    <div className="item-info">
                      <h4>{item.productName}</h4>
                      {item.sku && <p className="item-sku">SKU: {item.sku}</p>}
                      {item.variantName && (
                        <p className="item-variant">Variant: {item.variantName}</p>
                      )}
                      <p className="item-qty">Qty: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      <span className="unit-price">₦{item.unitPrice.toLocaleString()} each</span>
                      <span className="total-price">₦{item.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="order-shipping-section">
              <h3>Shipping Address</h3>
              <div className="address-card">
                <p className="name">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                <p>{order.shippingAddress.street}</p>
                {order.shippingAddress.apartment && <p>{order.shippingAddress.apartment}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                <p>{order.shippingAddress.country}</p>
                <p className="phone">{order.shippingAddress.phone}</p>
              </div>
            </section>

            {order.statusHistory && order.statusHistory.length > 0 && (
              <section className="order-history-section">
                <h3>Order Timeline</h3>
                <div className="timeline">
                  {order.statusHistory.map((history, index) => (
                    <div key={history.id} className={`timeline-item ${index === 0 ? 'current' : ''}`}>
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <span className="timeline-status">{history.status}</span>
                        <span className="timeline-date">{formatDate(history.createdAt)}</span>
                        {history.note && <p className="timeline-note">{history.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="order-summary-section">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₦{order.subtotal.toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div className="summary-row discount">
                  <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
                  <span>-₦{order.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span>{order.shipping === 0 ? 'Free' : `₦${order.shipping.toLocaleString()}`}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₦{order.total.toLocaleString()}</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
