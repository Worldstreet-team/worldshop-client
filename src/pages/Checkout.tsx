import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useAddressStore } from '@/store/addressStore';
import { checkoutService } from '@/services/orderService';
import { addressService } from '@/services/addressService';
import { paymentService, type WalletBalanceQuote } from '@/services/paymentService';
import Breadcrumb from '@/components/common/Breadcrumb';
import EmptyState from '@/components/common/EmptyState';
import { NIGERIAN_STATES, getStateDisplayName } from '@/utils/nigerianStates';
import type {
  CheckoutSessionPreview,
  CheckoutSessionResult,
  ShippingMethodSummary,
} from '@/types/order.types';

/** "Mon, Jul 20 – Wed, Jul 22" delivery window for a method, from today. */
function deliveryWindow(method: ShippingMethodSummary): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const min = new Date();
  min.setDate(min.getDate() + method.minDays);
  const max = new Date();
  max.setDate(max.getDate() + method.maxDays);
  return `${fmt(min)} – ${fmt(max)}`;
}
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
  const { cart, fetchCart, clearLocalCart } = useCartStore();
  const { addToast } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const { addresses: savedAddresses, isLoading: isLoadingAddresses, fetchAddresses } = useAddressStore();

  const [step, setStep] = useState(1);
  const [shipping, setShipping] = useState<ShippingFormData>(initialShipping);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<CheckoutSessionPreview | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  // Checkout is wallet-only: buyers pay from their central WorldStreet
  // dollar wallet. MOCK remains selectable in dev builds for local testing.
  const [selectedProvider, setSelectedProvider] = useState('WALLET');
  const [walletInfo, setWalletInfo] = useState<WalletBalanceQuote | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Delivery method selection
  const [shippingMethods, setShippingMethods] = useState<ShippingMethodSummary[]>([]);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      addToast({ message: 'Please log in to checkout', type: 'info' });
      navigate('/auth/login?returnUrl=/checkout');
    }
  }, [isAuthenticated, navigate, addToast]);

  useEffect(() => {
    if (!cart || cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !cart || cart.items.length === 0) return;
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAddresses().then(addrs => {
      const defaultAddr = addrs.find((a: Address) => a.isDefault);
      if (defaultAddr) {
        populateFromAddress(defaultAddr);
        setSelectedAddressId(defaultAddr.id);
      }
    }).catch(() => {
      addToast({ message: 'Failed to load saved addresses', type: 'error' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Refresh the wallet balance + USD conversion whenever the payable total
  // changes (the quote uses the same cached FX rate the charge will).
  const previewTotal = preview?.summary.total ?? null;
  useEffect(() => {
    if (!isAuthenticated || previewTotal === null || previewTotal <= 0) return;
    let cancelled = false;
    setIsLoadingWallet(true);
    setWalletError(null);
    paymentService
      .getWalletBalance(previewTotal)
      .then((res) => {
        if (!cancelled) setWalletInfo(res.data);
      })
      .catch(() => {
        if (!cancelled) setWalletError('Could not load your wallet balance');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWallet(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, previewTotal]);

  const loadPreview = async (
    shippingMethodId?: string | null,
  ): Promise<CheckoutSessionPreview | null> => {
    setIsPreviewing(true);
    try {
      const res = await checkoutService.previewSession(
        shippingMethodId ?? selectedShippingMethodId ?? undefined,
      );
      setPreview(res.data);
      // Reflect the method the server actually priced with (default = first active)
      if (res.data.shippingMethod && !selectedShippingMethodId) {
        setSelectedShippingMethodId(res.data.shippingMethod.id);
      }
      if (!res.data.requiresShipping) {
        setStep(2);
      }
      return res.data;
    } catch {
      addToast({ message: 'Failed to load checkout preview', type: 'error' });
      return null;
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleShippingMethodChange = (methodId: string) => {
    setSelectedShippingMethodId(methodId);
    void loadPreview(methodId);
  };

  // Load the available delivery methods once the cart needs shipping
  const requiresShipping = preview?.requiresShipping ?? false;
  useEffect(() => {
    if (!requiresShipping || shippingMethods.length > 0) return;
    checkoutService
      .getShippingMethods()
      .then((res) => setShippingMethods(res.data))
      .catch(() => {
        // Selector stays hidden; server prices with its default method
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiresShipping]);

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
    setSaveNewAddress(false);
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
    await loadPreview();
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handlePlaceOrder = async () => {
    if (!preview) return;
    setIsProcessing(true);

    try {
      if (saveNewAddress && !selectedAddressId && preview?.requiresShipping) {
        try {
          await addressService.createAddress({
            firstName: shipping.firstName,
            lastName: shipping.lastName,
            phone: shipping.phone,
            street: shipping.street,
            apartment: shipping.apartment || undefined,
            city: shipping.city,
            state: shipping.state,
            country: shipping.country,
            postalCode: shipping.postalCode,
          });
        } catch {
          // Non-blocking — address save failure shouldn't block checkout
        }
      }

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
          shippingMethodId: preview.requiresShipping
            ? (selectedShippingMethodId ?? undefined)
            : undefined,
        });
        result = confirmRes.data;
      } catch (error) {
        const status = (error as { statusCode?: number })?.statusCode ?? (error as { status?: number })?.status;
        if (status === 409) {
          addToast({ message: 'Your cart has changed. Refreshing...', type: 'warning' });
          await fetchCart();
          const freshPreview = await loadPreview();
          setStep(freshPreview?.requiresShipping ? 1 : 2);
          return;
        }
        throw error;
      }

      clearLocalCart();
      const payRes = await checkoutService.initializePayment(result.checkoutSessionId, selectedProvider);
      const { transactionRef, action } = payRes.data;

      if (action.type === 'redirect' && action.url) {
        window.location.href = action.url;
      } else {
        navigate(`/checkout/success?reference=${encodeURIComponent(transactionRef)}`);
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
            <Link to="/cart" className="btn-return-cart" style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}>
              Return to Cart to Fix Issues
            </Link>
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

                {/* Delivery Method */}
                {!isDigitalOnly && shippingMethods.length > 0 && (
                  <div className="review-section delivery-method-section">
                    <div className="review-header">
                      <h3>Delivery Method</h3>
                    </div>
                    <div className="payment-options">
                      {shippingMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`payment-option ${selectedShippingMethodId === method.id ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={method.id}
                            checked={selectedShippingMethodId === method.id}
                            onChange={() => handleShippingMethodChange(method.id)}
                            disabled={isPreviewing || isProcessing}
                          />
                          <span className="option-content">
                            <strong>{method.name}</strong>
                            <small>
                              via {method.partnerName} · ₦{method.price.toLocaleString()}
                              {method.freeAbove != null &&
                                ` (free over ₦${method.freeAbove.toLocaleString()})`}
                              {' · '}Arrives {deliveryWindow(method)}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                    {preview.shippingMethod && (
                      <p className="delivery-estimate-note">
                        Estimated delivery:{' '}
                        <strong>{deliveryWindow(preview.shippingMethod)}</strong> via{' '}
                        {preview.shippingMethod.partnerName}
                      </p>
                    )}
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

                  <div className="payment-method-selector">
                    <p className="selector-label">Payment Method:</p>
                    <div className="payment-options">
                      <label className={`payment-option ${selectedProvider === 'WALLET' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="provider"
                          value="WALLET"
                          checked={selectedProvider === 'WALLET'}
                          onChange={(e) => setSelectedProvider(e.target.value)}
                        />
                        <span className="option-content">
                          <strong>WorldStreet Wallet</strong>
                          {isLoadingWallet ? (
                            <small>Checking your balance…</small>
                          ) : walletError ? (
                            <small className="wallet-error">{walletError}</small>
                          ) : walletInfo ? (
                            <small>
                              Balance: ${walletInfo.balance.available.toFixed(2)}
                              {walletInfo.quote && (
                                <>
                                  {' · '}This order: ${walletInfo.quote.usd.toFixed(2)}{' '}
                                  (₦{walletInfo.quote.amountNgn.toLocaleString()} at ₦
                                  {walletInfo.quote.fxRate.toLocaleString()}/$)
                                </>
                              )}
                            </small>
                          ) : (
                            <small>Pay from your dollar balance</small>
                          )}
                        </span>
                      </label>
                      {import.meta.env.DEV && (
                        <label className={`payment-option ${selectedProvider === 'MOCK' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="provider"
                            value="MOCK"
                            checked={selectedProvider === 'MOCK'}
                            onChange={(e) => setSelectedProvider(e.target.value)}
                          />
                          <span className="option-content">
                            <strong>Mock Payment (Test)</strong>
                          </span>
                        </label>
                      )}
                    </div>
                    {selectedProvider === 'WALLET' &&
                      walletInfo?.quote &&
                      !walletInfo.quote.sufficient && (
                        <div className="wallet-insufficient">
                          <p>
                            Your wallet balance (${walletInfo.balance.available.toFixed(2)})
                            doesn't cover this order (${walletInfo.quote.usd.toFixed(2)}).
                            Top up your dollar wallet, then return to checkout.
                          </p>
                          {import.meta.env.VITE_WALLET_TOPUP_URL && (
                            <a
                              href={import.meta.env.VITE_WALLET_TOPUP_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline"
                            >
                              Top Up Wallet
                            </a>
                          )}
                        </div>
                      )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={handlePlaceOrder}
                    disabled={
                      isProcessing ||
                      preview.issues.length > 0 ||
                      (selectedProvider === 'WALLET' &&
                        walletInfo?.quote != null &&
                        !walletInfo.quote.sufficient)
                    }
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
