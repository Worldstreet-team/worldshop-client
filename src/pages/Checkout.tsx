import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { checkoutService } from '@/services/orderService';
import { addressService } from '@/services/addressService';
import Breadcrumb from '@/components/common/Breadcrumb';
import EmptyState from '@/components/common/EmptyState';
import { NIGERIAN_STATES, getStateDisplayName } from '@/utils/nigerianStates';
import type {
  CheckoutSessionPreview,
  CheckoutSessionResult,
} from '@/types/order.types';
import type { Address } from '@/types/user.types';

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

  // Steps: 1 = Shipping, 2 = Review & Pay
  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<ShippingFormData>(initialShipping);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<CheckoutSessionPreview | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

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

  // Load preview on mount
  useEffect(() => {
    if (!isAuthenticated || !cart || cart.items.length === 0) return;
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Fetch saved addresses
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoadingAddresses(true);
    addressService.getAddresses()
      .then(res => {
        const addrs = res.data;
        setSavedAddresses(addrs);
        const defaultAddr = addrs.find((a: Address) => a.isDefault);
        if (defaultAddr) {
          populateFromAddress(defaultAddr);
          setSelectedAddressId(defaultAddr.id);
        }
      })
      .catch(() => { /* silently ignore */ })
      .finally(() => setIsLoadingAddresses(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadPreview = async () => {
    setIsPreviewing(true);
    try {
      const res = await checkoutService.previewSession();
      setPreview(res.data);
      // Auto-advance to review if no shipping needed
      if (!res.data.requiresShipping) {
        setStep(2);
      }
    } catch {
      addToast({ message: 'Failed to load checkout preview', type: 'error' });
    } finally {
      setIsPreviewing(false);
    }
  };

  const populateFromAddress = useCallback((addr: Address) => {
    setShipping({
      firstName: addr.firstName,
      lastName: addr.lastName,
      email: shipping.email,
      phone: addr.phone,
      street: addr.street,
      apartment: addr.apartment || '',
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode || '',
      country: addr.country || 'Nigeria',
    });
  }, [shipping.email]);

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    populateFromAddress(addr);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId(null);
    setShipping({ ...initialShipping, email: shipping.email });
  };

  if (!isAuthenticated) return null;

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
    if (preview && !preview.requiresShipping) return true;
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
    // Refresh preview before advancing
    await loadPreview();
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handlePlaceOrder = async () => {
    if (!preview) return;
    setIsProcessing(true);

    try {
      // 1. Confirm checkout session
      let result: CheckoutSessionResult;
      try {
        const confirmRes = await checkoutService.confirmSession({
          snapshotToken: preview.snapshotToken,
          shippingAddress: preview.requiresShipping ? {
            firstName: shipping.firstName,
            lastName: shipping.lastName,
            phone: shipping.phone,
            street: shipping.street,
            apartment: shipping.apartment || undefined,
            city: shipping.city,
            state: shipping.state,
            country: shipping.country,
            postalCode: shipping.postalCode || undefined,
          } : undefined,
        });
        result = confirmRes.data;
      } catch (error) {
        const status = (error as { status?: number })?.status;
        if (status === 409) {
          // Cart changed — reload preview
          addToast({ message: 'Your cart has changed. Please review again.', type: 'warning' });
          await loadPreview();
          await fetchCart();
          return;
        }
        throw error;
      }

      // 2. Initialize payment
      const payRes = await checkoutService.initializePayment(result.checkoutSessionId);
      const { redirectUrl } = payRes.data;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        // Fallback — should not happen with mock provider
        navigate('/checkout/success?reference=' + payRes.data.transactionRef);
      }
    } catch (error) {
      const errorMessage = (error as { message?: string })?.message || 'Failed to place order';
      navigate('/checkout/failed', {
        state: { errorCode: 'ORDER_FAILED', errorMessage },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isDigitalOnly = preview ? !preview.requiresShipping : false;

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
          {!isDigitalOnly && (
            <>
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
            </>
          )}
          <div className={`step ${step >= 2 || isDigitalOnly ? 'active' : ''}`}>
            <span className="step-number">{isDigitalOnly ? '1' : '2'}</span>
            <span className="step-label">Review & Pay</span>
          </div>
        </div>

        {/* Preview Issues */}
        {preview && preview.issues.length > 0 && (
          <div className="validation-issues">
            <h4>Please resolve these issues:</h4>
            <ul>
              {preview.issues.map((issue, index) => (
                <li key={index}>
                  <strong>{issue.productName}:</strong> {issue.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isPreviewing && !preview && (
          <div className="checkout-loading">
            <span className="spinner" /> Loading checkout…
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-form-section">
            {/* Step 1: Shipping */}
            {step === 1 && (
              <div className="checkout-step shipping-step">
                <h2>Shipping Address</h2>

                {/* Saved Addresses Picker */}
                {isLoadingAddresses ? (
                  <div className="saved-addresses-loading">
                    <span className="spinner" /> Loading saved addresses…
                  </div>
                ) : savedAddresses.length > 0 && (
                  <div className="saved-addresses-picker">
                    <p className="picker-label">Choose a saved address:</p>
                    <div className="saved-addresses-grid">
                      {savedAddresses.map(addr => (
                        <button
                          key={addr.id}
                          type="button"
                          className={`saved-address-card${selectedAddressId === addr.id ? ' selected' : ''}`}
                          onClick={() => handleSelectAddress(addr)}
                        >
                          {addr.isDefault && <span className="default-tag">Default</span>}
                          <span className="addr-name">{addr.firstName} {addr.lastName}</span>
                          <span className="addr-line">{addr.street}{addr.apartment ? `, ${addr.apartment}` : ''}</span>
                          <span className="addr-line">{addr.city}, {addr.state}</span>
                          <span className="addr-phone">{addr.phone}</span>
                        </button>
                      ))}
                    </div>
                    {selectedAddressId && (
                      <button type="button" className="btn-link use-new-address" onClick={handleUseNewAddress}>
                        Use a different address
                      </button>
                    )}
                  </div>
                )}

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
                        {NIGERIAN_STATES.map(s => (
                          <option key={s} value={s}>{getStateDisplayName(s)}</option>
                        ))}
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
                    <button type="submit" className="btn btn-primary" disabled={isPreviewing}>
                      {isPreviewing ? 'Validating...' : 'Continue to Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 2: Review & Pay */}
            {step === 2 && preview && (
              <div className="checkout-step review-step">
                <h2>Review Your Order</h2>

                {!isDigitalOnly && (
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
                )}

                {isDigitalOnly && (
                  <div className="review-section">
                    <div className="review-header">
                      <h3>Digital Delivery</h3>
                    </div>
                    <div className="review-content">
                      <p>Your digital products will be delivered via email after payment.</p>
                      <p>You can also download them from your account.</p>
                    </div>
                  </div>
                )}

                {/* Vendor-Grouped Items */}
                {preview.vendorGroups.map((group) => (
                  <div key={group.vendorId ?? 'platform'} className="review-section vendor-order-group">
                    <div className="review-header">
                      <h3>
                        {group.vendorId ? (
                          <>From <Link to={`/store/${group.storeName.toLowerCase().replace(/\s+/g, '-')}`}>{group.storeName}</Link></>
                        ) : (
                          <>From WorldShop</>
                        )}
                      </h3>
                    </div>
                    <div className="review-items">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="review-item">
                          {item.image && (
                            <img src={item.image} alt={item.productName} />
                          )}
                          <div className="item-details">
                            <h4>{item.productName}</h4>
                            {item.variantName && <p className="item-variant">{item.variantName}</p>}
                            <p className="item-qty">Qty: {item.quantity}</p>
                          </div>
                          <div className="item-price">
                            ₦{item.totalPrice.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="vendor-group-totals">
                      <div className="summary-row">
                        <span>Subtotal</span>
                        <span>₦{group.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="summary-row">
                        <span>Shipping</span>
                        <span>{group.shipping === 0 ? 'Free' : `₦${group.shipping.toLocaleString()}`}</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="step-actions">
                  {isDigitalOnly ? (
                    <Link to="/cart" className="btn btn-outline">Back to Cart</Link>
                  ) : (
                    <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || preview.issues.length > 0}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner" />
                        Processing...
                      </>
                    ) : (
                      <>Place Order — ₦{preview.summary.total.toLocaleString()}</>
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
              {preview ? (
                <>
                  <div className="summary-items">
                    {preview.vendorGroups.flatMap(g => g.items).map((item, idx) => (
                      <div key={idx} className="summary-item">
                        <div className="item-image">
                          {item.image && <img src={item.image} alt={item.productName} />}
                          <span className="item-qty-badge">{item.quantity}</span>
                        </div>
                        <div className="item-info">
                          <span className="item-name">{item.productName}</span>
                        </div>
                        <span className="item-price">₦{item.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <hr />
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₦{preview.summary.subtotal.toLocaleString()}</span>
                  </div>
                  {preview.summary.discount > 0 && (
                    <div className="summary-row discount">
                      <span>Discount</span>
                      <span>-₦{preview.summary.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>{preview.summary.shipping === 0 ? 'Free' : `₦${preview.summary.shipping.toLocaleString()}`}</span>
                  </div>
                  <hr />
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>₦{preview.summary.total.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
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
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>{cart.shipping === 0 ? 'Free' : `₦${cart.shipping.toLocaleString()}`}</span>
                  </div>
                  <hr />
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>₦{cart.total.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
