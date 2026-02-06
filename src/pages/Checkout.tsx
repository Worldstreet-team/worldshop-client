import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart } = useCartStore();
  const [step, setStep] = useState(1);

  if (!cart || cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>

        {/* Checkout Steps Indicator */}
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Shipping</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Payment</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-section">
            {step === 1 && (
              <div className="checkout-step shipping-step">
                <h2>Shipping Address</h2>
                {/* AddressForm component will be added here */}
                <p>Address form coming soon...</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setStep(2)}
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-step payment-step">
                <h2>Payment Method</h2>
                {/* PaymentForm component will be added here */}
                <p>Payment integration coming soon...</p>
                <div className="step-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setStep(3)}
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-step review-step">
                <h2>Review Your Order</h2>
                {/* OrderReview component will be added here */}
                <p>Order review coming soon...</p>
                <div className="step-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/checkout/success')}
                  >
                    Place Order
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="checkout-summary-section">
            <div className="checkout-summary">
              <h3>Order Summary</h3>
              <ul className="summary-items">
                {cart.items.map((item) => (
                  <li key={item.id} className="summary-item">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>${item.totalPrice.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <hr />
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>$0.00</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
