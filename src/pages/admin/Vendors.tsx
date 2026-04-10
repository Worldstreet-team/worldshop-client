import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type AdminVendor, type AdminVendorFilters } from '@/services/adminService';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

const formatPrice = (price: number) =>
  '₦' + price.toLocaleString('en-NG', { minimumFractionDigits: 0 });

const formatDate = (dateStr: string | null) =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const getStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'ACTIVE': return 'badge badge-success';
    case 'SUSPENDED': return 'badge badge-warning';
    case 'BANNED': return 'badge badge-danger';
    default: return 'badge badge-default';
  }
};

export default function AdminVendors() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminVendorFilters>({
    page: 1,
    limit: 20,
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getVendors({ ...filters, search: search || undefined });
      setVendors(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load vendors' });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  return (
    <div className="admin-vendors">
      <div className="page-header">
        <h1>Vendors {pagination && <small>({pagination.total})</small>}</h1>
        <Link to="/admin/settings/commission" className="btn btn-secondary">
          <span className="material-icons">settings</span>
          Commission Settings
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'contents' }}>
          <input
            type="search"
            placeholder="Search vendors..."
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
              status: (e.target.value || undefined) as AdminVendorFilters['status'],
              page: 1,
            }))
          }
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
        </select>
        <select
          className="filter-select"
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as any, page: 1 }))}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
      </div>

      {/* Vendors Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Store</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Products</th>
              <th>Earnings</th>
              <th>Since</th>
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
            ) : vendors.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  <p>No vendors found.</p>
                </td>
              </tr>
            ) : (
              vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td>
                    <strong>{vendor.storeName || '(No store name)'}</strong>
                    {vendor.storeSlug && (
                      <small className="text-muted d-block">/store/{vendor.storeSlug}</small>
                    )}
                  </td>
                  <td>
                    <div>{vendor.firstName} {vendor.lastName}</div>
                    <small className="text-muted">{vendor.email}</small>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(vendor.vendorStatus)}>
                      {vendor.vendorStatus}
                    </span>
                  </td>
                  <td>{vendor.productCount}</td>
                  <td>{formatPrice(vendor.totalEarnings)}</td>
                  <td>{formatDate(vendor.vendorSince)}</td>
                  <td>
                    <Link to={`/admin/vendors/${vendor.id}`} className="btn-icon" title="View Details">
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
