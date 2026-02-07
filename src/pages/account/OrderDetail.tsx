import { Link, useParams } from 'react-router-dom';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="order-detail-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account/orders" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Orders
          </Link>
          <h1>Order Details</h1>
        </div>

        <div className="order-detail-content">
          <div className="order-info-card">
            <h2>Order #{id}</h2>
            <div className="order-meta">
              <span>Placed on: January 15, 2026</span>
              <span className="order-status status-processing">Processing</span>
            </div>
          </div>

          <div className="order-sections">
            <section className="order-items-section">
              <h3>Order Items</h3>
              <p>Order items will be displayed here...</p>
            </section>

            <section className="order-shipping-section">
              <h3>Shipping Address</h3>
              <p>Shipping address will be displayed here...</p>
            </section>

            <section className="order-payment-section">
              <h3>Payment Information</h3>
              <p>Payment details will be displayed here...</p>
            </section>

            <section className="order-summary-section">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>$0.00</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>$0.00</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>$0.00</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
