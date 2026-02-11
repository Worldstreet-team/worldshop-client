import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type AdminOrderFilters, type AdminOrder, type OrderStats } from '@/services/adminService';
import type { OrderStatus } from '@/types/order.types';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'CREATED', label: 'Created' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
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

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminOrderFilters>({
    page: 1,
    limit: 20,
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getOrders({
        ...filters,
        search: search || undefined,
      });
      setOrders(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load orders' });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    adminService.getOrderStats('30d').then(setStats).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  return (
    <div className="admin-orders">
      <div className="page-header">
        <h1>Orders {pagination && <small>({pagination.total})</small>}</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{stats.totalOrders}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatPrice(stats.totalRevenue)}</div>
            <div className="stat-label">Revenue (30d)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.statusCounts?.PROCESSING || 0}</div>
            <div className="stat-label">Processing</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.statusCounts?.SHIPPED || 0}</div>
            <div className="stat-label">Shipped</div>
          </div>
        </div>
      )}

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
          onChange={(e) => setFilters((f) => ({
            ...f,
            status: (e.target.value || undefined) as OrderStatus | undefined,
            page: 1,
          }))}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="filter-select"
          value={filters.dateFrom || ''}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
          placeholder="From"
        />
        <input
          type="date"
          className="filter-select"
          value={filters.dateTo || ''}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
          placeholder="To"
        />
        <select
          className="filter-select"
          value={filters.sortBy || 'newest'}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as AdminOrderFilters['sortBy'], page: 1 }))}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="total_desc">Highest Total</option>
          <option value="total_asc">Lowest Total</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Items</th>
              <th>Date</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}><div className="skeleton-row" /></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  <p>No orders found.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const firstItem = order.items?.[0];
                const itemCount = order.items?.length || 0;

                return (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/admin/orders/${order.id}`} className="link-primary">
                        <strong>{order.orderNumber}</strong>
                      </Link>
                    </td>
                    <td>
                      <div className="product-cell">
                        {firstItem?.productImage && (
                          <img src={firstItem.productImage} alt={firstItem.productName} className="product-thumb" />
                        )}
                        <div>
                          <span>{firstItem?.productName || '—'}</span>
                          {itemCount > 1 && <small className="text-muted"> +{itemCount - 1} more</small>}
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td><strong>{formatPrice(order.total)}</strong></td>
                    <td>
                      {order.payment ? (
                        <span className={`badge ${order.payment.status === 'SUCCESS' ? 'badge-success' : 'badge-warning'}`}>
                          {order.payment.status}
                        </span>
                      ) : (
                        <span className="badge badge-default">Pending</span>
                      )}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/admin/orders/${order.id}`} className="btn-icon" title="View Details">
                          <span className="material-icons">visibility</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
