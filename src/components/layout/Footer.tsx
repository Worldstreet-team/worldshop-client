import { useState } from 'react';
import { Link } from 'react-router-dom';

const footerLinks = {
  shop: [
    { label: 'All Products', href: '/shop' },
    { label: 'Categories', href: '/categories' },
    { label: 'Featured', href: '/shop?featured=true' },
    { label: 'New Arrivals', href: '/shop?sort=newest' },
  ],
  support: [
    { label: 'My Account', href: '/account' },
    { label: 'Track Order', href: '/account/orders' },
    { label: 'Returns & Refunds', href: '/returns' },
    { label: 'FAQs', href: '/faq' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribeStatus('success');
      setEmail('');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    }
  };

  return (
    <footer className="site-footer">
      {/* Newsletter Banner */}
      <div className="footer-newsletter-bar">
        <div className="container">
          <div className="newsletter-bar-inner">
            <div className="newsletter-bar-text">
              <h3>Stay in the loop</h3>
              <p>Subscribe for exclusive deals and new arrivals</p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="newsletter-bar-form">
              <div className="newsletter-input-wrapper">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="newsletter-input"
                  required
                />
                <button type="submit" className="newsletter-btn">
                  Subscribe
                </button>
              </div>
              {subscribeStatus === 'success' && (
                <span className="newsletter-success">Thanks for subscribing!</span>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-column footer-column-brand">
              <Link to="/" className="footer-logo">
                <img
                  src="/images/worldstreet-mark.png"
                  alt="WorldStreet"
                  className="footer-logo-icon"
                  width="32"
                  height="32"
                />
                <span className="logo-text">WorldStreet<span className="logo-dot">.</span></span>
              </Link>
              <p className="footer-about">
                Your one-stop destination for quality products at competitive prices.
              </p>
              <div className="footer-social">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Shop Column */}
            <div className="footer-column">
              <h4 className="footer-title">Shop</h4>
              <ul className="footer-links">
                {footerLinks.shop.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Column */}
            <div className="footer-column">
              <h4 className="footer-title">Support</h4>
              <ul className="footer-links">
                {footerLinks.support.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div className="footer-column">
              <h4 className="footer-title">Company</h4>
              <ul className="footer-links">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-content">
            <p className="copyright">
              &copy; {currentYear} WorldStreet. All rights reserved.
            </p>
            <div className="footer-legal">
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/cookies">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
