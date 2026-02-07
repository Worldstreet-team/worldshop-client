import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';
import { EmptyState, Breadcrumb } from '@/components/common';
import { toast } from '@/store/uiStore';

export default function CartPage() {
  const { cart, removeItem, updateQuantity, applyCoupon, removeCoupon, isUpdating } = useCartStore();
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    try {
      await applyCoupon(couponCode);
      toast.success('Coupon applied successfully!');
      setCouponCode('');
    } catch (error) {
      toast.error((error as Error).message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon();
      toast.success('Coupon removed');
    } catch {
      toast.error('Failed to remove coupon');
    }
  };

  const handleRemoveItem = async (itemId: string, productName: string) => {
    try {
      await removeItem(itemId);
      toast.success(`${productName} removed from cart`);
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Cart' },
  ];

  if (!cart || cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <Breadcrumb items={breadcrumbItems} />
          <div className="py-12">
            <EmptyState
              title="Your Cart is Empty"
              description="Looks like you haven't added any items to your cart yet."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="80" height="80">
                  <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              actionLabel="Start Shopping"
              actionLink="/shop"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="page-header">
          <h1>Shopping Cart</h1>
          <p className="item-count">{cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items-section">
            <div className="cart-items-list">
              {cart.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <Link to={`/products/${item.product.slug}`}>
                      <img 
                        src={item.product.images[0]?.url || '/images/placeholder-product.png'} 
                        alt={item.product.name} 
                      />
                    </Link>
                  </div>
                  
                  <div className="cart-item-details">
                    <Link to={`/products/${item.product.slug}`} className="cart-item-name">
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <span className="cart-item-variant">{item.variant.name}</span>
                    )}
                    <span className="cart-item-sku">SKU: {item.product.sku}</span>
                  </div>
                  
                  <div className="cart-item-price">
                    <span className="price">${item.price.toFixed(2)}</span>
                  </div>
                  
                  <div className="cart-item-quantity">
                    <div className="quantity-input">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isUpdating || item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <input 
                        type="number" 
                        value={item.quantity} 
                        min="1"
                        readOnly
                        aria-label="Quantity"
                      />
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isUpdating}
                        aria-label="Increase quantity"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="cart-item-total">
                    <span className="total">${item.totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <button 
                    className="cart-item-remove"
                    onClick={() => handleRemoveItem(item.id, item.product.name)}
                    disabled={isUpdating}
                    aria-label="Remove item"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            
            <div className="cart-actions">
              <Link to="/shop" className="btn btn-outline">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="cart-summary-section">
            <div className="cart-summary">
              <h3>Order Summary</h3>
              
              <div className="summary-rows">
                <div className="summary-row">
                  <span>Subtotal ({cart.itemCount} items)</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                
                {cart.discount > 0 && (
                  <div className="summary-row discount">
                    <span>
                      Discount
                      {cart.couponCode && (
                        <button 
                          className="remove-coupon" 
                          onClick={handleRemoveCoupon}
                          title="Remove coupon"
                        >
                          ({cart.couponCode}) ×
                        </button>
                      )}
                    </span>
                    <span>-${cart.discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{cart.shipping === 0 ? 'FREE' : `$${cart.shipping.toFixed(2)}`}</span>
                </div>
                
                <div className="summary-row">
                  <span>Estimated Tax</span>
                  <span>${cart.tax.toFixed(2)}</span>
                </div>
              </div>
              
              <hr />
              
              <div className="summary-row total">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              
              {cart.subtotal < 50 && (
                <div className="free-shipping-notice">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Add ${(50 - cart.subtotal).toFixed(2)} more for FREE shipping!
                </div>
              )}
              
              {/* Coupon Code */}
              {!cart.couponCode && (
                <div className="coupon-section">
                  <label htmlFor="coupon">Have a coupon?</label>
                  <div className="coupon-input">
                    <input
                      type="text"
                      id="coupon"
                      placeholder="Enter code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={isApplyingCoupon}
                    />
                    <button 
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="btn btn-secondary"
                    >
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  <small className="coupon-hint">Try: SAVE10, SAVE20, WELCOME</small>
                </div>
              )}
              
              <Link to="/checkout" className="btn btn-primary btn-block checkout-btn">
                Proceed to Checkout
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              
              <div className="secure-checkout">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
