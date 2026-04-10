import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { adminService, type AdminVendorDetail as VendorDetail } from '@/services/adminService';
import type { Product } from '@/types/product.types';
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

const getOrderStatusClass = (status: string): string => {
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

export default function AdminVendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productPagination, setProductPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      adminService.getVendor(id),
      adminService.getVendorProducts(id, { page: 1, limit: 10 }),
    ])
      .then(([vendorData, productsData]) => {
        setVendor(vendorData);
        setProducts(productsData.data);
        setProductPagination(productsData.pagination);
      })
      .catch((err: any) => {
        addToast({ type: 'error', message: err.response?.data?.message || 'Failed to load vendor' });
        navigate('/admin/vendors');
      })
      .finally(() => setLoading(false));
  }, [id, addToast, navigate]);

  const handleStatusChange = async (newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    if (!id || !vendor) return;
    const action = newStatus === 'BANNED' ? 'ban' : newStatus === 'SUSPENDED' ? 'suspend' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${vendor.storeName}"?`)) return;

    setUpdating(true);
    try {
      await adminService.updateVendorStatus(id, newStatus);
      setVendor((v) => v ? { ...v, vendorStatus: newStatus } : v);
      addToast({ type: 'success', message: `Vendor status updated to ${newStatus}.` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-vendor-detail">
        <div className="page-header">
          <Link to="/admin/vendors" className="back-link">
            <span className="material-icons">arrow_back</span> Back to Vendors
          </Link>
          <h1>Loading...</h1>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ height: 80, marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="admin-vendor-detail">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/admin/vendors" className="back-link">
            <span className="material-icons">arrow_back</span> Back to Vendors
          </Link>
          <h1>{vendor.storeName || 'Unnamed Store'}</h1>
          <span className={getStatusBadgeClass(vendor.vendorStatus)}>{vendor.vendorStatus}</span>
        </div>
      </div>

      <div className="order-detail-layout">
        <div className="order-main">
          {/* Vendor Info */}
          <section className="detail-section">
            <h2>Vendor Information</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Owner</span>
                <span>{vendor.firstName} {vendor.lastName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span>{vendor.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span>{vendor.phone || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Store Slug</span>
                <span>{vendor.storeSlug ? (
                  <Link to={`/store/${vendor.storeSlug}`}>/store/{vendor.storeSlug}</Link>
                ) : '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Vendor Since</span>
                <span>{formatDate(vendor.vendorSince)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Joined</span>
                <span>{formatDate(vendor.createdAt)}</span>
              </div>
            </div>
            {vendor.storeDescription && (
              <div style={{ marginTop: '1rem' }}>
                <span className="detail-label">Description</span>
                <p>{vendor.storeDescription}</p>
              </div>
            )}
          </section>

          {/* Status Management */}
          <section className="detail-section">
            <h2>Status Management</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {vendor.vendorStatus !== 'ACTIVE' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={updating}
                >
                  <span className="material-icons">check_circle</span>
                  Activate
                </button>
              )}
              {vendor.vendorStatus !== 'SUSPENDED' && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleStatusChange('SUSPENDED')}
                  disabled={updating}
                >
                  <span className="material-icons">pause_circle</span>
                  Suspend
                </button>
              )}
              {vendor.vendorStatus !== 'BANNED' && (
                <button
                  className="btn btn-danger"
                  onClick={() => handleStatusChange('BANNED')}
                  disabled={updating}
                >
                  <span className="material-icons">block</span>
                  Ban
                </button>
              )}
            </div>
          </section>

          {/* Recent Orders */}
          {vendor.recentOrders.length > 0 && (
            <section className="detail-section">
              <h2>Recent Orders</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
                      </td>
                      <td>
                        <span className={getOrderStatusClass(order.status)}>{order.status}</span>
                      </td>
                      <td>{formatPrice(order.total)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Products */}
          {products.length > 0 && (
            <section className="detail-section">
              <h2>Products ({productPagination?.total ?? products.length})</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link to={`/admin/products/${product.id}`}>{product.name}</Link>
                      </td>
                      <td>{formatPrice(product.basePrice)}</td>
                      <td>
                        <span className={`badge ${product.isActive ? 'badge-success' : 'badge-secondary'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${product.approvalStatus === 'APPROVED' ? 'success' : product.approvalStatus === 'PENDING' ? 'warning' : 'danger'}`}>
                          {product.approvalStatus || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="order-sidebar">
          <section className="detail-section">
            <h2>Statistics</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Products</span>
                <span><strong>{vendor.stats.productCount}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Orders</span>
                <span><strong>{vendor.stats.orderCount}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Total Earnings</span>
                <span><strong>{formatPrice(vendor.stats.totalEarnings)}</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Commission Paid</span>
                <span>{formatPrice(vendor.stats.totalCommission)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: '0.75rem' }}>
                <span className="text-muted">Available Balance</span>
                <span><strong>{formatPrice(vendor.stats.availableBalance)}</strong></span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
