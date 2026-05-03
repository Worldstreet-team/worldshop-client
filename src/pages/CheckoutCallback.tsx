import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function CheckoutCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get('status');
    const txRef = searchParams.get('tx_ref');

    if (!txRef) {
      navigate('/cart', { replace: true });
      return;
    }

    if (status === 'successful' || status === 'success') {
      navigate(`/checkout/success?reference=${encodeURIComponent(txRef)}`, { replace: true });
    } else {
      navigate('/checkout/failed', {
        replace: true,
        state: {
          errorCode: 'PAYMENT_DECLINED',
          errorMessage: 'Your payment was not completed.',
          reference: txRef,
        },
      });
    }
  }, [searchParams, navigate]);

  return (
    <div className="checkout-callback-page">
      <div className="container">
        <div className="callback-loading">
          <span className="spinner" />
          <p>Verifying your payment...</p>
        </div>
      </div>
    </div>
  );
}
