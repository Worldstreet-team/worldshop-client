import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types/order.types';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const response = await orderService.getOrders();
        setOrders(response.data || []);
      } catch (err) {
        setError('Failed to load orders');
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

  if (isLoading) {
    return (
      <div className="order-history-page">
        <div className="container">
          <div className="loading-spinner">Loading orders...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-history-page">
        <div className="container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Account
          </Link>
          <h1>Order History</h1>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="When you place orders, they will appear here."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            actionLabel="Start Shopping"
            actionLink="/shop"
          />
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div>
                    <h3>Order #{order.orderNumber}</h3>
                    <span className="order-date">{formatDate(order.createdAt)}</span>
                  </div>
                  <span className={`order-status ${getStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-body">
                  <p>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  <p className="order-total">₦{order.total.toLocaleString()}</p>
                </div>
                <div className="order-footer">
                  <Link to={`/account/orders/${order.id}`} className="btn btn-secondary">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
