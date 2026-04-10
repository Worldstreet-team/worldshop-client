import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { vendorService, type VendorProductFilters } from '@/services/vendorService';
import { categoryService } from '@/services/productService';
import type { Product, Category } from '@/types/product.types';
import type { Pagination } from '@/types/common.types';
import { useUIStore } from '@/store/uiStore';

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<VendorProductFilters>({
    page: 1,
    limit: 15,
    status: 'all',
    sortBy: 'newest',
  });
  const [search, setSearch] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.getProducts({ ...filters, search: search || undefined });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  }, [filters, search, addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const handleToggle = async (product: Product) => {
    try {
      await vendorService.toggleProduct(product.id, !product.isActive);
      addToast({
        type: 'success',
        message: `"${product.name}" ${product.isActive ? 'deactivated' : 'activated'}.`,
      });
      fetchProducts();
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to toggle product' });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? It will no longer appear in the store.`)) return;
    try {
      await vendorService.deleteProduct(id);
      addToast({ type: 'success', message: `"${name}" deactivated.` });
      fetchProducts();
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to delete product' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const formatPrice = (price: number) =>
    '₦' + price.toLocaleString('en-NG', { minimumFractionDigits: 0 });

  return (
    <div className="vendor-products">
      <div className="page-header">
        <h1>My Products {pagination && <small>({pagination.total})</small>}</h1>
        <Link to="/vendor/products/new" className="btn btn-primary">
          <span className="material-icons">add</span>
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'contents' }}>
          <input
            type="search"
            placeholder="Search your products..."
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
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as any, page: 1 }))}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="price_asc">Price Low–High</option>
          <option value="price_desc">Price High–Low</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5}><div className="skeleton-row" /></td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">
                  <p>No products found. {!search && <Link to="/vendor/products/new">Add your first product!</Link>}</p>
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
                          {product.variants?.length > 0 && (
                            <small className="text-muted"> · {product.variants.length} variant(s)</small>
                          )}
                        </div>
                      </div>
                    </td>
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
                    <td>
                      <button
                        className={`badge badge-toggle ${product.isActive ? 'badge-success' : 'badge-secondary'}`}
                        onClick={() => handleToggle(product)}
                        title={product.isActive ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/vendor/products/${product.id}`} className="btn-icon" title="Edit">
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
