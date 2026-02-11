import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type AdminProductFilters } from '@/services/adminService';
import { categoryService } from '@/services/productService';
import type { Product, Category } from '@/types/product.types';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AdminProductFilters>({
    page: 1,
    limit: 15,
    status: 'all',
    stock: 'all',
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminService.getProducts({ ...filters, search: search || undefined });
      setProducts(result.data);
      setPagination(result.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => { });
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will no longer appear in the store.`)) return;
    try {
      await adminService.deleteProduct(id);
      addToast({ type: 'success', message: `"${name}" deactivated.` });
      fetchProducts();
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to delete product' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const formatPrice = (price: number) =>
    '₦' + price.toLocaleString('en-NG', { minimumFractionDigits: 0 });

  const getStockBadge = (stock: number, threshold: number) => {
    if (stock <= 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (stock <= threshold) return <span className="badge badge-warning">Low Stock ({stock})</span>;
    return <span className="badge badge-success">{stock}</span>;
  };

  return (
    <div className="admin-products">
      <div className="page-header">
        <h1>Products {pagination && <small>({pagination.total})</small>}</h1>
        <Link to="/admin/products/new" className="btn btn-primary">
          <span className="material-icons">add</span>
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'contents' }}>
          <input
            type="search"
            placeholder="Search products..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="filter-select"
          value={filters.categoryId || ''}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as any, page: 1 }))}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="filter-select"
          value={filters.stock}
          onChange={(e) => setFilters((f) => ({ ...f, stock: e.target.value as any, page: 1 }))}
        >
          <option value="all">All Stock Levels</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8}><div className="skeleton-row" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-row">
                  <p>No products found. {!search && <Link to="/admin/products/new">Add your first product!</Link>}</p>
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const primaryImage = Array.isArray(product.images)
                  ? (product.images as any[]).find((img: any) => img.isPrimary) || (product.images as any[])[0]
                  : null;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        {primaryImage && (
                          <img src={primaryImage.url} alt={product.name} className="product-thumb" />
                        )}
                        <div>
                          <strong>{product.name}</strong>
                          {product.brand && <small className="text-muted"> · {product.brand}</small>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${product.type === 'DIGITAL' ? 'badge-info' : 'badge-default'}`}>
                        {product.type === 'DIGITAL' ? 'Digital' : 'Physical'}
                      </span>
                    </td>
                    <td>{product.stockKeepingUnit || '—'}</td>
                    <td>{product.category?.name || '—'}</td>
                    <td>
                      {product.salePrice ? (
                        <>
                          <span className="price-sale">{formatPrice(product.salePrice)}</span>
                          <span className="price-original">{formatPrice(product.basePrice)}</span>
                        </>
                      ) : (
                        formatPrice(product.basePrice)
                      )}
                    </td>
                    <td>{getStockBadge(product.stock, product.lowStockThreshold)}</td>
                    <td>
                      {product.isActive ? (
                        <span className="badge badge-success">Active</span>
                      ) : (
                        <span className="badge badge-secondary">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/admin/products/${product.id}`} className="btn-icon" title="Edit">
                          <span className="material-icons">edit</span>
                        </Link>
                        <button
                          className="btn-icon btn-icon-danger"
                          title="Deactivate"
                          onClick={() => handleDelete(product.id, product.name)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
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
