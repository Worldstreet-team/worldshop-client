import { useState, useEffect, useCallback } from 'react';
import {
  adminService,
  type AdminInventoryFilters,
  type InventoryItem,
  type InventoryStats,
} from '@/services/adminService';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

const getStockBadge = (status: InventoryItem['status']) => {
  switch (status) {
    case 'out-of-stock': return <span className="badge badge-danger">Out of Stock</span>;
    case 'low-stock': return <span className="badge badge-warning">Low Stock</span>;
    default: return <span className="badge badge-success">In Stock</span>;
  }
};

export default function AdminInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminInventoryFilters>({
    page: 1,
    limit: 20,
    stock: 'all',
    sortBy: 'stock_asc',
  });
  const [search, setSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  // Adjust stock modal state
  const [adjustModal, setAdjustModal] = useState<{ item: InventoryItem; variantId?: string } | null>(null);
  const [adjustment, setAdjustment] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Threshold edit state
  const [thresholdEdit, setThresholdEdit] = useState<{ id: string; value: string } | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getInventory({
        ...filters,
        search: search || undefined,
      });
      setItems(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load inventory' });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    adminService.getInventoryStats().then(setStats).catch(() => { });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const handleAdjustStock = async () => {
    if (!adjustModal || !adjustment || !adjustReason) return;
    setAdjusting(true);
    try {
      const result = await adminService.adjustStock(adjustModal.item.id, {
        adjustment: parseInt(adjustment, 10),
        reason: adjustReason,
        variantId: adjustModal.variantId,
      });
      addToast({
        type: 'success',
        message: `Stock adjusted: ${result.previousStock} → ${result.newStock}`,
      });
      setAdjustModal(null);
      setAdjustment('');
      setAdjustReason('');
      fetchInventory();
      // Refresh stats
      adminService.getInventoryStats().then(setStats).catch(() => { });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to adjust stock' });
    } finally {
      setAdjusting(false);
    }
  };

  const handleSaveThreshold = async () => {
    if (!thresholdEdit) return;
    try {
      const result = await adminService.updateThreshold(
        thresholdEdit.id,
        parseInt(thresholdEdit.value, 10),
      );
      addToast({
        type: 'success',
        message: `Threshold updated: ${result.previousThreshold} → ${result.newThreshold}`,
      });
      setThresholdEdit(null);
      fetchInventory();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to update threshold' });
    }
  };

  return (
    <div className="admin-inventory">
      <div className="page-header">
        <h1>Inventory {pagination && <small>({pagination.total})</small>}</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{stats.totalProducts}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#16a34a' }}>{stats.inStock}</div>
            <div className="stat-label">In Stock</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#d97706' }}>{stats.lowStock}</div>
            <div className="stat-label">Low Stock</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#dc2626' }}>{stats.outOfStock}</div>
            <div className="stat-label">Out of Stock</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'contents' }}>
          <input
            type="search"
            placeholder="Search products or SKU..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="filter-select"
          value={filters.stock || 'all'}
          onChange={(e) => setFilters((f) => ({ ...f, stock: e.target.value as StockFilter, page: 1 }))}
        >
          <option value="all">All Stock Levels</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
        <select
          className="filter-select"
          value={filters.sortBy || 'stock_asc'}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as AdminInventoryFilters['sortBy'], page: 1 }))}
        >
          <option value="stock_asc">Lowest Stock First</option>
          <option value="stock_desc">Highest Stock First</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Threshold</th>
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
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  <p>No inventory data found.</p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} style={item.status === 'out-of-stock' ? { backgroundColor: '#fef2f2' } : item.status === 'low-stock' ? { backgroundColor: '#fffbeb' } : undefined}>
                  <td>
                    <div className="product-cell">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="product-thumb" />
                      )}
                      <div>
                        <strong>{item.name}</strong>
                        {item.variants.length > 0 && (
                          <small className="text-muted"> · {item.variants.length} variant(s)</small>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{item.sku || '—'}</td>
                  <td>{item.categoryName || '—'}</td>
                  <td>
                    <strong style={{ color: item.stock <= 0 ? '#dc2626' : item.stock <= item.lowStockThreshold ? '#d97706' : '#16a34a' }}>
                      {item.stock}
                    </strong>
                  </td>
                  <td>
                    {thresholdEdit?.id === item.id ? (
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={thresholdEdit.value}
                          onChange={(e) => setThresholdEdit({ ...thresholdEdit, value: e.target.value })}
                          style={{ width: 60, padding: '2px 4px' }}
                          min={0}
                        />
                        <button className="btn-icon" title="Save" onClick={handleSaveThreshold}>
                          <span className="material-icons" style={{ fontSize: 18 }}>check</span>
                        </button>
                        <button className="btn-icon" title="Cancel" onClick={() => setThresholdEdit(null)}>
                          <span className="material-icons" style={{ fontSize: 18 }}>close</span>
                        </button>
                      </div>
                    ) : (
                      <span
                        style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                        title="Click to edit threshold"
                        onClick={() => setThresholdEdit({ id: item.id, value: String(item.lowStockThreshold) })}
                      >
                        {item.lowStockThreshold}
                      </span>
                    )}
                  </td>
                  <td>{getStockBadge(item.status)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Adjust Stock"
                        onClick={() => {
                          setAdjustModal({ item });
                          setAdjustment('');
                          setAdjustReason('');
                        }}
                      >
                        <span className="material-icons">tune</span>
                      </button>
                    </div>
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

      {/* Stock Adjustment Modal */}
      {adjustModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="modal-content" style={{
            background: '#fff', borderRadius: 8, padding: '1.5rem', width: '100%',
            maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          }}>
            <h3 style={{ margin: '0 0 1rem' }}>Adjust Stock — {adjustModal.item.name}</h3>

            {/* Variant selector if has variants */}
            {adjustModal.item.variants.length > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Target</label>
                <select
                  className="filter-select"
                  value={adjustModal.variantId || ''}
                  onChange={(e) => setAdjustModal({ ...adjustModal, variantId: e.target.value || undefined })}
                  style={{ width: '100%' }}
                >
                  <option value="">Main Product (stock: {adjustModal.item.stock})</option>
                  {adjustModal.item.variants.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} (stock: {v.stock})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Adjustment (positive to add, negative to subtract)
              </label>
              <input
                type="number"
                className="search-input"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                placeholder="e.g. 10 or -5"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Reason *</label>
              <input
                type="text"
                className="search-input"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Restocked from supplier"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setAdjustModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAdjustStock}
                disabled={!adjustment || !adjustReason || adjusting}
              >
                {adjusting ? 'Adjusting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
