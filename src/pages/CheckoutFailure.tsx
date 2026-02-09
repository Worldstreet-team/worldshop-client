import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Breadcrumb from '@/components/common/Breadcrumb';

interface FailureState {
  errorCode?: string;
  errorMessage?: string;
}

export default function CheckoutFailurePage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const failureData = location.state as FailureState | null;
  const reference = searchParams.get('reference') || searchParams.get('trxref');

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Checkout Failed' },
  ];

  const getErrorMessage = () => {
    if (failureData?.errorMessage) {
      return failureData.errorMessage;
    }

    // Paystack redirect with reference — payment was abandoned or failed
    if (reference) {
      return 'Your payment could not be completed. Your order has been saved — you can retry payment from your orders page.';
    }

    // Default error messages based on error codes
    switch (failureData?.errorCode) {
      case 'PAYMENT_DECLINED':
        return 'Your payment was declined. Please check your card details and try again.';
      case 'INSUFFICIENT_FUNDS':
        return 'Your card has insufficient funds. Please try a different payment method.';
      case 'CARD_EXPIRED':
        return 'Your card has expired. Please use a different card.';
      case 'NETWORK_ERROR':
        return 'A network error occurred. Please check your connection and try again.';
      case 'INVENTORY_ERROR':
        return 'Some items in your cart are no longer available.';
      default:
        return 'We encountered an issue processing your order. Please try again or contact support.';
    }
  };

  return (
    <div className="checkout-failure-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="failure-content">
          <div className="failure-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h1>Order Could Not Be Completed</h1>
          <p className="failure-message">{getErrorMessage()}</p>

          {failureData?.errorCode && (
            <div className="error-code">
              Error Code: <code>{failureData.errorCode}</code>
            </div>
          )}

          <div className="troubleshooting">
            <h3>What You Can Try</h3>
            <ul>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                <span>Double-check your payment information and try again</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                <span>Refresh the page and attempt checkout again</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Use a different payment method if available</span>
              </li>
              <li>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span>Contact your bank if the issue persists</span>
              </li>
            </ul>
          </div>

          <div className="failure-actions">
            <Link to="/checkout" className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              Try Again
            </Link>
            <Link to="/cart" className="btn btn-outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
              Return to Cart
            </Link>
          </div>

          <div className="support-section">
            <h3>Need Help?</h3>
            <p>Our support team is available 24/7 to assist you.</p>
            <div className="support-options">
              <a href="mailto:support@worldshop.com" className="support-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                support@worldshop.com
              </a>
              <a href="tel:1-800-WORLDSHOP" className="support-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                1-800-WORLDSHOP
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
