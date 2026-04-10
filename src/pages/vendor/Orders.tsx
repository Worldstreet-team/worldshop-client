import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { vendorService, type VendorOrderFilters } from '@/services/vendorService';
import type { Order, OrderStatus } from '@/types/order.types';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

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

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

export default function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VendorOrderFilters>({
    page: 1,
    limit: 15,
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.getOrders({ ...filters, search: search || undefined });
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load orders' });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  return (
    <div className="vendor-orders">
      <div className="page-header">
        <h1>Orders {pagination && <small>({pagination.total})</small>}</h1>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'contents' }}>
          <input
            type="search"
            placeholder="Search by order number..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="filter-select"
          value={filters.status || ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              status: (e.target.value || undefined) as OrderStatus | undefined,
              page: 1,
            }))
          }
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as any, page: 1 }))}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="total_desc">Total High–Low</option>
          <option value="total_asc">Total Low–High</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6}><div className="skeleton-row" /></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  <p>No orders found.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/vendor/orders/${order.id}`} className="order-link">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/vendor/orders/${order.id}`} className="btn-icon" title="View Details">
                      <span className="material-icons">visibility</span>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
