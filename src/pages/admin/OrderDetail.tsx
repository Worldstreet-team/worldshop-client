import { Link, useParams } from 'react-router-dom';

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="admin-order-detail">
      <div className="page-header">
        <Link to="/admin/orders" className="back-link">
          <span className="material-icons">arrow_back</span>
          Back to Orders
        </Link>
        <h1>Order #{id}</h1>
      </div>

      <div className="order-detail-layout">
        <div className="order-main">
          {/* Order Status */}
          <section className="detail-section">
            <div className="section-header">
              <h2>Order Status</h2>
              <select className="status-select">
                <option value="created">Created</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <div className="status-timeline">
              <p>Order timeline will be displayed here...</p>
            </div>
          </section>

          {/* Order Items */}
          <section className="detail-section">
            <h2>Order Items</h2>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4}>No items</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <div className="order-sidebar">
          {/* Customer Info */}
          <section className="detail-section">
            <h2>Customer</h2>
            <p>Customer info coming soon...</p>
          </section>

          {/* Shipping Address */}
          <section className="detail-section">
            <h2>Shipping Address</h2>
            <p>Address coming soon...</p>
          </section>

          {/* Order Summary */}
          <section className="detail-section">
            <h2>Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₦0</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>₦0</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>₦0</span>
            </div>
          </section>

          {/* Actions */}
          <div className="order-actions">
            <button className="btn btn-secondary btn-block">
              Print Invoice
            </button>
            <button className="btn btn-danger btn-block">
              Process Refund
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
