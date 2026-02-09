import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { checkoutService, orderService } from '@/services/orderService';
import Breadcrumb from '@/components/common/Breadcrumb';
import EmptyState from '@/components/common/EmptyState';
import type { ShippingAddress } from '@/types/order.types';

interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  apartment: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const initialShipping: ShippingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  apartment: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Nigeria',
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, fetchCart } = useCartStore();
  const { addToast } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<ShippingFormData>(initialShipping);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      addToast({ message: 'Please log in to checkout', type: 'info' });
      navigate('/login?returnUrl=/checkout');
    }
  }, [isAuthenticated, navigate, addToast]);

  // Redirect to cart if empty
  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  if (!isAuthenticated) {
    return null;
  }

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

  const validateShipping = () => {
    const required = ['firstName', 'lastName', 'phone', 'street', 'city', 'state'];
    for (const field of required) {
      if (!shipping[field as keyof ShippingFormData]) {
        addToast({ message: `Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, type: 'error' });
        return false;
      }
    }
    return true;
  };

  const handleContinueToReview = async () => {
    if (!validateShipping()) return;

    setIsValidating(true);
    setValidationIssues([]);

    try {
      // Validate cart with backend (check stock, prices)
      const response = await checkoutService.validateCart();

      if (!response.data.valid) {
        setValidationIssues(response.data.issues || ['Unable to proceed with checkout']);
        addToast({ message: 'Please review the issues below', type: 'error' });
        // Refresh cart to get updated data
        await fetchCart();
        return;
      }

      setStep(2);
      window.scrollTo(0, 0);
    } catch (error) {
      addToast({ message: 'Failed to validate cart. Please try again.', type: 'error' });
    } finally {
      setIsValidating(false);
    }
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    try {
      // Create the shipping address object for the API
      const shippingAddress: ShippingAddress = {
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        phone: shipping.phone,
        street: shipping.street,
        apartment: shipping.apartment || undefined,
        city: shipping.city,
        state: shipping.state,
        country: shipping.country,
        postalCode: shipping.postalCode || undefined,
      };

      // Create order via API
      const response = await orderService.createOrder({
        shippingAddress,
      });

      const order = response.data;

      // Navigate to success page with order info
      navigate('/checkout/success', {
        state: {
          orderNumber: order.orderNumber,
          orderId: order.id,
          total: order.total
        }
      });
    } catch (error) {
      // Navigate to failure page with error info
      const errorMessage = (error as { message?: string })?.message || 'Failed to create order';
      navigate('/checkout/failed', {
        state: {
          errorCode: 'ORDER_FAILED',
          errorMessage
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
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Review & Pay</span>
          </div>
        </div>

        {/* Validation Issues */}
        {validationIssues.length > 0 && (
          <div className="validation-issues">
            <h4>Please resolve these issues:</h4>
            <ul>
              {validationIssues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-form-section">
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="checkout-step shipping-step">
                <h2>Shipping Address</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleContinueToReview(); }}>
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
                    <label htmlFor="street">Street Address *</label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={shipping.street}
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
                      <select
                        id="state"
                        name="state"
                        value={shipping.state}
                        onChange={handleShippingChange}
                        required
                      >
                        <option value="">Select State</option>
                        <option value="Abia">Abia</option>
                        <option value="Adamawa">Adamawa</option>
                        <option value="Akwa Ibom">Akwa Ibom</option>
                        <option value="Anambra">Anambra</option>
                        <option value="Bauchi">Bauchi</option>
                        <option value="Bayelsa">Bayelsa</option>
                        <option value="Benue">Benue</option>
                        <option value="Borno">Borno</option>
                        <option value="Cross River">Cross River</option>
                        <option value="Delta">Delta</option>
                        <option value="Ebonyi">Ebonyi</option>
                        <option value="Edo">Edo</option>
                        <option value="Ekiti">Ekiti</option>
                        <option value="Enugu">Enugu</option>
                        <option value="FCT">FCT - Abuja</option>
                        <option value="Gombe">Gombe</option>
                        <option value="Imo">Imo</option>
                        <option value="Jigawa">Jigawa</option>
                        <option value="Kaduna">Kaduna</option>
                        <option value="Kano">Kano</option>
                        <option value="Katsina">Katsina</option>
                        <option value="Kebbi">Kebbi</option>
                        <option value="Kogi">Kogi</option>
                        <option value="Kwara">Kwara</option>
                        <option value="Lagos">Lagos</option>
                        <option value="Nasarawa">Nasarawa</option>
                        <option value="Niger">Niger</option>
                        <option value="Ogun">Ogun</option>
                        <option value="Ondo">Ondo</option>
                        <option value="Osun">Osun</option>
                        <option value="Oyo">Oyo</option>
                        <option value="Plateau">Plateau</option>
                        <option value="Rivers">Rivers</option>
                        <option value="Sokoto">Sokoto</option>
                        <option value="Taraba">Taraba</option>
                        <option value="Yobe">Yobe</option>
                        <option value="Zamfara">Zamfara</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="postalCode">Postal Code</label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={shipping.postalCode}
                        onChange={handleShippingChange}
                        placeholder="100001"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="country">Country</label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={shipping.country}
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="step-actions">
                    <Link to="/cart" className="btn btn-outline">
                      Back to Cart
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={isValidating}>
                      {isValidating ? 'Validating...' : 'Continue to Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Review & Pay */}
            {step === 2 && (
              <div className="checkout-step review-step">
                <h2>Review Your Order</h2>

                <div className="review-section">
                  <div className="review-header">
                    <h3>Shipping Address</h3>
                    <button type="button" className="edit-btn" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div className="review-content">
                    <p>{shipping.firstName} {shipping.lastName}</p>
                    <p>{shipping.street}{shipping.apartment && `, ${shipping.apartment}`}</p>
                    <p>{shipping.city}, {shipping.state} {shipping.postalCode}</p>
                    <p>{shipping.country}</p>
                    <p>{shipping.email}</p>
                    <p>{shipping.phone}</p>
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
                          ₦{item.totalPrice.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="step-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
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
                      <>Place Order - ₦{cart.total.toLocaleString()}</>
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
                    <span className="item-price">₦{item.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <hr />
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₦{cart.subtotal.toLocaleString()}</span>
              </div>
              {cart.discount > 0 && (
                <div className="summary-row discount">
                  <span>Discount {cart.couponCode && `(${cart.couponCode})`}</span>
                  <span>-₦{cart.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Shipping</span>
                <span>{cart.shipping === 0 ? 'Free' : `₦${cart.shipping.toLocaleString()}`}</span>
              </div>
              <hr />
              <div className="summary-row total">
                <span>Total</span>
                <span>₦{cart.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
