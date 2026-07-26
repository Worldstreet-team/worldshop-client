import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { paymentService, type WalletBalanceQuote } from '@/services/paymentService';

/**
 * Homepage wallet summary. Buyers pay from their central WorldStreet dollar
 * wallet, so we surface the available balance up-front once they're signed in.
 * Renders nothing for guests.
 */
export default function WalletBalanceBanner() {
  const { isAuthenticated, user } = useAuthStore();
  const [wallet, setWallet] = useState<WalletBalanceQuote | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    setIsLoading(true);
    setError(false);
    paymentService
      .getWalletBalance()
      .then((res) => {
        if (!cancelled) setWallet(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Guests don't have a wallet — nothing to show.
  if (!isAuthenticated) return null;

  return (
    <section className="wallet-banner-section">
      <div className="container">
        <div className="wallet-banner">
          <div className="wallet-banner-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="28" height="28">
              <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="16" cy="13" r="1.4" />
            </svg>
          </div>

          <div className="wallet-banner-info">
            <span className="wallet-banner-label">
              {user?.firstName ? `Welcome back, ${user.firstName}` : 'WorldStreet Wallet'}
            </span>
            {isLoading ? (
              <span className="wallet-banner-amount is-loading">Loading balance…</span>
            ) : error ? (
              <span className="wallet-banner-amount is-error">Balance unavailable right now</span>
            ) : (
              <span className="wallet-banner-amount">
                ${wallet?.balance.available.toFixed(2) ?? '0.00'}
                <span className="wallet-banner-currency"> available</span>
              </span>
            )}
          </div>

          <div className="wallet-banner-actions">
            <a
              href="https://dashboard.worldstreetgold.com"
              className="wallet-banner-btn secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Top up
            </a>
            <Link to="/products" className="wallet-banner-btn">
              Start shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
