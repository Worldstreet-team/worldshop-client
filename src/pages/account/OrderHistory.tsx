import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types/order.types';

const STATUS_LABELS: Record<string, string> = {
  ALL: 'All Orders',
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

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const response = await orderService.getOrders();
        setOrders(response.data || []);
      } catch (err) {
        setError('Failed to load your orders. Please try again.');
        console.error('Error fetching orders:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length };
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders;
    return orders.filter((o) => o.status === activeFilter);
  }, [orders, activeFilter]);

  // W10 FIX: Group orders by checkoutSessionId for display
  const groupedOrders = useMemo(() => {
    const groups: { sessionId: string | null; orders: Order[] }[] = [];
    const sessionMap = new Map<string, Order[]>();
    const ungrouped: Order[] = [];

    for (const order of filteredOrders) {
      if (order.checkoutSessionId) {
        const existing = sessionMap.get(order.checkoutSessionId);
        if (existing) {
          existing.push(order);
        } else {
          sessionMap.set(order.checkoutSessionId, [order]);
        }
      } else {
        ungrouped.push(order);
      }
    }

    for (const [sessionId, sessionOrders] of sessionMap) {
      groups.push({ sessionId, orders: sessionOrders });
    }
    for (const order of ungrouped) {
      groups.push({ sessionId: null, orders: [order] });
    }

    return groups;
  }, [filteredOrders]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getItemSummary = (order: Order) => {
    if (order.items.length === 0) return 'No items';
    const firstName = order.items[0].productName;
    if (order.items.length === 1) return firstName;
    return `${firstName} and ${order.items.length - 1} more`;
  };

  // ----- Loading -----
  if (isLoading) {
    return (
      <div className="orders-page">
        <div className="container">
          <div className="page-header">
            <Link to="/account" className="back-link">
              <span className="material-icons">arrow_back</span>
              Back to Account
            </Link>
            <h1>Order History</h1>
          </div>
          <div className="orders-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-header">
                  <div className="skeleton-line w-150" />
                  <div className="skeleton-line w-80" />
                </div>
                <div className="skeleton-body">
                  <div className="skeleton-thumbnails">
                    <div className="skeleton-line h-56" />
                    <div className="skeleton-line h-56" />
                  </div>
                  <div>
                    <div className="skeleton-line w-200" />
                    <div className="skeleton-line w-100" style={{ marginTop: 8 }} />
                  </div>
                </div>
                <div className="skeleton-footer">
                  <div className="skeleton-line w-100" />
                  <div className="skeleton-line w-120" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ----- Error -----
  if (error) {
    return (
      <div className="orders-page">
        <div className="container">
          <div className="page-header">
            <Link to="/account" className="back-link">
              <span className="material-icons">arrow_back</span>
              Back to Account
            </Link>
            <h1>Order History</h1>
          </div>
          <div className="orders-error">
            <span className="material-icons error-icon">error_outline</span>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- Empty -----
  if (orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="container">
          <div className="page-header">
            <Link to="/account" className="back-link">
              <span className="material-icons">arrow_back</span>
              Back to Account
            </Link>
            <h1>Order History</h1>
          </div>
          <div className="orders-empty">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="72" height="72">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>No orders yet</h2>
            <p>When you place orders, they'll appear here so you can track them.</p>
            <Link to="/products" className="btn-shop">
              <span className="material-icons">shopping_bag</span>
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----- Orders List -----
  return (
    <div className="orders-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Account
          </Link>
          <h1>Order History</h1>
        </div>

        {/* Status filter tabs */}
        <div className="status-filters">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = statusCounts[key] || 0;
            if (key !== 'ALL' && count === 0) return null;
            return (
              <button
                key={key}
                className={`filter-tab ${activeFilter === key ? 'active' : ''}`}
                onClick={() => setActiveFilter(key)}
              >
                {label}
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <p>No {STATUS_LABELS[activeFilter]?.toLowerCase()} orders found.</p>
          </div>
        ) : (
          <>
            <div className="results-summary">
              Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              {groupedOrders.length !== filteredOrders.length && (
                <> across {groupedOrders.length} checkout{groupedOrders.length !== 1 ? 's' : ''}</>
              )}
            </div>
            <div className="orders-list">
              {groupedOrders.map((group) => (
                <div key={group.sessionId || group.orders[0].id} className={group.orders.length > 1 ? 'order-group' : ''}>
                  {group.orders.length > 1 && (
                    <div className="order-group-header" style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px 8px 0 0',
                      borderBottom: '1px solid #e9ecef',
                      fontSize: '0.85rem',
                      color: '#666',
                    }}>
                      Checkout with {group.orders.length} vendor orders
                    </div>
                  )}
                  {group.orders.map((order) => (
                <div key={order.id} className="order-card">
                  {/* Header: order number, date, status */}
                  <div className="order-card-header">
                    <div className="order-card-meta">
                      <span className="order-number">
                        <Link to={`/account/orders/${order.id}`}>#{order.orderNumber}</Link>
                      </span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span className={STATUS_CLASS[order.status] || 'status-default'}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  {/* Body: thumbnails + summary */}
                  <div className="order-card-body">
                    <div className="order-items-preview">
                      <div className="order-thumbnails">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="thumbnail">
                            <img
                              src={item.productImage || '/images/products/placeholder.jpg'}
                              alt={item.productName}
                            />
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="thumbnail-more">+{order.items.length - 3}</div>
                        )}
                      </div>
                      <div className="order-items-info">
                        <p className="items-summary">{getItemSummary(order)}</p>
                        <p className="items-count">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer: total + view details */}
                  <div className="order-card-footer">
                    <div className="order-total">
                      <span className="currency">NGN </span>₦{order.total.toLocaleString()}
                    </div>
                    <Link to={`/account/orders/${order.id}`} className="btn-view-details">
                      View Details
                      <span className="material-icons">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}
              </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
