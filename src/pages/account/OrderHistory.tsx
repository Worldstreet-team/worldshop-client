import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common';

export default function OrderHistoryPage() {
  // Mock orders for now - will be replaced with API call
  const orders: Array<{
    id: string;
    orderNumber: string;
    date: string;
    status: string;
    total: number;
    itemCount: number;
  }> = [];

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
                    <span className="order-date">{order.date}</span>
                  </div>
                  <span className={`order-status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-body">
                  <p>{order.itemCount} items</p>
                  <p className="order-total">${order.total.toFixed(2)}</p>
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
