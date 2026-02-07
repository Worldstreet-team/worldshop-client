import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import Breadcrumb from '@/components/common/Breadcrumb';
import EmptyState from '@/components/common/EmptyState';

interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentInfo {
  cardNumber: string;
  cardName: string;
  expiryDate: string;
  cvv: string;
}

const initialShipping: ShippingAddress = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  apartment: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
};

const initialPayment: PaymentInfo = {
  cardNumber: '',
  cardName: '',
  expiryDate: '',
  cvv: '',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCartStore();
  const { addToast } = useUIStore();
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<ShippingAddress>(initialShipping);
  const [payment, setPayment] = useState<PaymentInfo>(initialPayment);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect to cart if empty
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="checkout-page">
        <div className="container">
          <EmptyState
            icon="cart"
            title="Your cart is empty"
            description="Add items to your cart before checking out."
            actionLabel="Browse Products"
            actionLink="/products"
          />
        </div>
      </div>
    );
  }

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShipping(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Format card number with spaces
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    }
    // Format expiry date
    if (e.target.name === 'expiryDate') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
      }
    }
    
    setPayment(prev => ({ ...prev, [e.target.name]: value }));
  };

  const validateShipping = () => {
    const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    for (const field of required) {
      if (!shipping[field as keyof ShippingAddress]) {
        addToast({ message: `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, type: 'error' });
        return false;
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(shipping.email)) {
      addToast({ message: 'Please enter a valid email address', type: 'error' });
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    if (!payment.cardNumber || payment.cardNumber.replace(/\s/g, '').length < 16) {
      addToast({ message: 'Please enter a valid card number', type: 'error' });
      return false;
    }
    if (!payment.cardName) {
      addToast({ message: 'Please enter the name on card', type: 'error' });
      return false;
    }
    if (!payment.expiryDate || payment.expiryDate.length < 5) {
      addToast({ message: 'Please enter a valid expiry date', type: 'error' });
      return false;
    }
    if (!payment.cvv || payment.cvv.length < 3) {
      addToast({ message: 'Please enter a valid CVV', type: 'error' });
      return false;
    }
    return true;
  };

  const handleContinueToPayment = () => {
    if (validateShipping()) {
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handleContinueToReview = () => {
    if (validatePayment()) {
      setStep(3);
      window.scrollTo(0, 0);
    }
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random failure for testing (10% chance)
      // In production, this would be replaced with actual API error handling
      const shouldFail = Math.random() < 0.1;
      
      if (shouldFail) {
        throw new Error('PAYMENT_DECLINED');
      }
      
      // Generate order number
      const orderNumber = `WS-${Date.now().toString(36).toUpperCase()}`;
      
      // Clear cart
      await clearCart();
      
      // Navigate to success page with order info
      navigate('/checkout/success', { 
        state: { 
          orderNumber,
          email: shipping.email,
          total: cart.total
        } 
      });
    } catch (error) {
      // Navigate to failure page with error info
      const errorCode = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      navigate('/checkout/failed', {
        state: {
          errorCode,
          errorMessage: undefined // Let the failure page determine the message
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Cart', href: '/cart' },
    { label: 'Checkout' },
  ];

  return (
    <div className="checkout-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
        
        <h1>Checkout</h1>

        {/* Checkout Steps Indicator */}
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-number">
              {step > 1 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : '1'}
            </span>
            <span className="step-label">Shipping</span>
          </div>
          <div className="step-connector" />
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-number">
              {step > 2 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : '2'}
            </span>
            <span className="step-label">Payment</span>
          </div>
          <div className="step-connector" />
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-section">
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="checkout-step shipping-step">
                <h2>Shipping Address</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleContinueToPayment(); }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="firstName">First Name *</label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={shipping.firstName}
                        onChange={handleShippingChange}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="lastName">Last Name *</label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={shipping.lastName}
                        onChange={handleShippingChange}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={shipping.email}
                        onChange={handleShippingChange}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Phone *</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={shipping.phone}
                        onChange={handleShippingChange}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="address">Street Address *</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={shipping.address}
                      onChange={handleShippingChange}
                      placeholder="123 Main Street"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="apartment">Apartment, suite, etc. (optional)</label>
                    <input
                      type="text"
                      id="apartment"
                      name="apartment"
                      value={shipping.apartment}
                      onChange={handleShippingChange}
                      placeholder="Apt 4B"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="city">City *</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={shipping.city}
                        onChange={handleShippingChange}
                        placeholder="New York"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="state">State *</label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={shipping.state}
                        onChange={handleShippingChange}
                        placeholder="NY"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="zipCode">ZIP Code *</label>
                      <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        value={shipping.zipCode}
                        onChange={handleShippingChange}
                        placeholder="10001"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <select
                      id="country"
                      name="country"
                      value={shipping.country}
                      onChange={handleShippingChange}
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>
                  
                  <div className="step-actions">
                    <Link to="/cart" className="btn btn-outline">
                      Back to Cart
                    </Link>
                    <button type="submit" className="btn btn-primary">
                      Continue to Payment
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="checkout-step payment-step">
                <h2>Payment Method</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleContinueToReview(); }}>
                  <div className="payment-methods">
                    <label className="payment-method active">
                      <input type="radio" name="method" value="card" defaultChecked />
                      <span className="method-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                          <line x1="1" y1="10" x2="23" y2="10" />
                        </svg>
                        Credit / Debit Card
                      </span>
                    </label>
                  </div>
                  
                  <div className="card-form">
                    <div className="form-group">
                      <label htmlFor="cardNumber">Card Number *</label>
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        value={payment.cardNumber}
                        onChange={handlePaymentChange}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="cardName">Name on Card *</label>
                      <input
                        type="text"
                        id="cardName"
                        name="cardName"
                        value={payment.cardName}
                        onChange={handlePaymentChange}
                        placeholder="JOHN DOE"
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="expiryDate">Expiry Date *</label>
                        <input
                          type="text"
                          id="expiryDate"
                          name="expiryDate"
                          value={payment.expiryDate}
                          onChange={handlePaymentChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="cvv">CVV *</label>
                        <input
                          type="text"
                          id="cvv"
                          name="cvv"
                          value={payment.cvv}
                          onChange={handlePaymentChange}
                          placeholder="123"
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="secure-notice">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Your payment information is encrypted and secure
                  </div>
                  
                  <div className="step-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                      Back
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Review Order
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="checkout-step review-step">
                <h2>Review Your Order</h2>
                
                <div className="review-section">
                  <div className="review-header">
                    <h3>Shipping Address</h3>
                    <button type="button" className="edit-btn" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div className="review-content">
                    <p>{shipping.firstName} {shipping.lastName}</p>
                    <p>{shipping.address}{shipping.apartment && `, ${shipping.apartment}`}</p>
                    <p>{shipping.city}, {shipping.state} {shipping.zipCode}</p>
                    <p>{shipping.country}</p>
                    <p>{shipping.email}</p>
                    <p>{shipping.phone}</p>
                  </div>
                </div>
                
                <div className="review-section">
                  <div className="review-header">
                    <h3>Payment Method</h3>
                    <button type="button" className="edit-btn" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <div className="review-content">
                    <p>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                      **** **** **** {payment.cardNumber.slice(-4)}
                    </p>
                  </div>
                </div>
                
                <div className="review-section">
                  <h3>Order Items</h3>
                  <div className="review-items">
                    {cart.items.map((item) => (
                      <div key={item.id} className="review-item">
                        <img src={item.product.images[0]?.url || '/placeholder.jpg'} alt={item.product.name} />
                        <div className="item-details">
                          <h4>{item.product.name}</h4>
                          <p className="item-qty">Qty: {item.quantity}</p>
                        </div>
                        <div className="item-price">
                          ${item.totalPrice.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="step-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-lg"
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner" />
                        Processing...
                      </>
                    ) : (
                      <>Place Order - ${cart.total.toFixed(2)}</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="checkout-summary-section">
            <div className="checkout-summary">
              <h3>Order Summary</h3>
              <div className="summary-items">
                {cart.items.map((item) => (
                  <div key={item.id} className="summary-item">
                    <div className="item-image">
                      <img src={item.product.images[0]?.url || '/placeholder.jpg'} alt={item.product.name} />
                      <span className="item-qty-badge">{item.quantity}</span>
                    </div>
                    <div className="item-info">
                      <span className="item-name">{item.product.name}</span>
                    </div>
                    <span className="item-price">${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <hr />
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="summary-row discount">
                  <span>Discount {cart.couponCode && `(${cart.couponCode})`}</span>
                  <span>-${cart.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span>{cart.shipping === 0 ? 'Free' : `$${cart.shipping.toFixed(2)}`}</span>
              </div>
              <div className="summary-row">
                <span>Tax</span>
                <span>${cart.tax.toFixed(2)}</span>
              </div>
              <hr />
              <div className="summary-row total">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
