import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { paymentService } from '@/services/paymentService';
import { useCartStore } from '@/store/cartStore';

export default function MockPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchCart } = useCartStore();

  const sessionId = searchParams.get('session');
  const transactionRef = searchParams.get('ref');

  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'confirm' | 'decline' | null>(null);

  if (!sessionId || !transactionRef) {
    return (
      <div className="mock-payment-page">
        <div className="container">
          <div className="mock-payment-card">
            <div className="mock-payment-error">
              <h2>Invalid Payment Link</h2>
              <p>This payment link is missing required parameters.</p>
              <Link to="/cart" className="btn btn-primary">Return to Cart</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleAction = async (selectedAction: 'confirm' | 'decline') => {
    setIsProcessing(true);
    setAction(selectedAction);

    try {
      await paymentService.sendWebhook(sessionId, selectedAction);
      // Refresh cart (should be cleared after confirm)
      await fetchCart();

      if (selectedAction === 'confirm') {
        navigate(`/checkout/success?reference=${encodeURIComponent(transactionRef)}`);
      } else {
        navigate('/checkout/failed', {
          state: {
            errorCode: 'PAYMENT_DECLINED',
            errorMessage: 'You chose to decline this payment.',
            reference: transactionRef,
          },
        });
      }
    } catch {
      navigate('/checkout/failed', {
        state: {
          errorCode: 'PAYMENT_ERROR',
          errorMessage: 'An error occurred while processing your payment.',
          reference: transactionRef,
        },
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mock-payment-page">
      <div className="container">
        <div className="mock-payment-card">
          <div className="mock-payment-header">
            <div className="mock-badge">TEST MODE</div>
            <h1>Mock Payment Gateway</h1>
            <p className="mock-subtitle">This is a simulated payment page for development.</p>
          </div>

          <div className="mock-payment-details">
            <div className="detail-row">
              <span className="detail-label">Session</span>
              <span className="detail-value">{sessionId.slice(0, 12)}…</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Reference</span>
              <span className="detail-value">{transactionRef}</span>
            </div>
          </div>

          <div className="mock-payment-actions">
            <button
              className="btn btn-primary btn-lg mock-confirm-btn"
              onClick={() => handleAction('confirm')}
              disabled={isProcessing}
            >
              {isProcessing && action === 'confirm' ? (
                <><span className="spinner" /> Confirming…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Confirm Payment
                </>
              )}
            </button>

            <button
              className="btn btn-outline btn-lg mock-decline-btn"
              onClick={() => handleAction('decline')}
              disabled={isProcessing}
            >
              {isProcessing && action === 'decline' ? (
                <><span className="spinner" /> Declining…</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Decline Payment
                </>
              )}
            </button>
          </div>

          <p className="mock-disclaimer">
            In production, this page will be replaced by a real payment provider.
          </p>
        </div>
      </div>
    </div>
  );
}
