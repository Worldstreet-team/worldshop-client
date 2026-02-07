import { Link, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Breadcrumb from '@/components/common/Breadcrumb';

interface OrderState {
  orderNumber: string;
  email: string;
  total: number;
}

export default function CheckoutSuccessPage() {
  const location = useLocation();
  const [orderData, setOrderData] = useState<OrderState | null>(null);

  useEffect(() => {
    // Get order data from navigation state
    if (location.state) {
      setOrderData(location.state as OrderState);
    }
  }, [location.state]);

  // If no order data and not coming from checkout, redirect
  if (!location.state && !orderData) {
    return <Navigate to="/" replace />;
  }

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Order Confirmation' },
  ];

  // Calculate estimated delivery date (3-5 business days from now)
  const getDeliveryDate = () => {
    const today = new Date();
    const minDays = 3;
    const maxDays = 5;
    
    const addBusinessDays = (date: Date, days: number) => {
      const result = new Date(date);
      let added = 0;
      while (added < days) {
        result.setDate(result.getDate() + 1);
        if (result.getDay() !== 0 && result.getDay() !== 6) {
          added++;
        }
      }
      return result;
    };
    
    const minDate = addBusinessDays(today, minDays);
    const maxDate = addBusinessDays(today, maxDays);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
  };

  return (
    <div className="checkout-success-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="success-content">
          <div className="success-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <h1>Thank You for Your Order!</h1>
          <p className="success-message">
            Your order has been placed successfully. We've sent a confirmation email to{' '}
            <strong>{orderData?.email || 'your email address'}</strong>.
          </p>
          
          <div className="order-card">
            <div className="order-card-header">
              <h2>Order Details</h2>
            </div>
            <div className="order-card-body">
              <div className="order-detail">
                <span className="label">Order Number</span>
                <span className="value">{orderData?.orderNumber || '#WS-XXXXX'}</span>
              </div>
              <div className="order-detail">
                <span className="label">Order Date</span>
                <span className="value">{new Date().toLocaleDateString('en-US', { 
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="order-detail">
                <span className="label">Estimated Delivery</span>
                <span className="value">{getDeliveryDate()}</span>
              </div>
              <div className="order-detail total">
                <span className="label">Order Total</span>
                <span className="value">${orderData?.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
          
          <div className="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Check your email for order confirmation and tracking details</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span>We'll notify you when your order ships</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Enjoy your new products once they arrive!</span>
              </li>
            </ul>
          </div>

          <div className="success-actions">
            <Link to="/account/orders" className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              View My Orders
            </Link>
            <Link to="/products" className="btn btn-outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Continue Shopping
            </Link>
          </div>
          
          <div className="support-note">
            <p>
              Have questions about your order?{' '}
              <Link to="/contact">Contact our support team</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
