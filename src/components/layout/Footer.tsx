import { useState } from 'react';
import { Link } from 'react-router-dom';

const footerLinks = {
  findItFast: [
    { label: 'Laptops & Computers', href: '/category/laptops' },
    { label: 'Cameras & Photography', href: '/category/cameras' },
    { label: 'Smartphones & Tablets', href: '/category/smartphones' },
    { label: 'Video Games & Consoles', href: '/category/gaming' },
    { label: 'TV & Audio', href: '/category/audio' },
    { label: 'Gadgets & Accessories', href: '/category/accessories' },
  ],
  customerCare: [
    { label: 'My Account', href: '/account' },
    { label: 'Track Your Order', href: '/account/orders' },
    { label: 'Customer Service', href: '/contact' },
    { label: 'Returns & Refunds', href: '/returns' },
    { label: 'FAQs', href: '/faq' },
    { label: 'Product Support', href: '/support' },
  ],
  aboutUs: [
    { label: 'About WorldStreet', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Our Blog', href: '/blog' },
    { label: 'Affiliate Program', href: '/affiliate' },
    { label: 'Sell on WorldStreet', href: '/sell' },
    { label: 'Contact Us', href: '/contact' },
  ],
};

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="12 15 17 21 7 21 12 15" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Free Shipping',
    description: 'On orders over $50',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Secure Payment',
    description: '100% secure checkout',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="22,6 12,13 2,6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: '24/7 Support',
    description: 'Dedicated support team',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
        <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Easy Returns',
    description: '30-day return policy',
  },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // TODO: Implement newsletter subscription
      setSubscribeStatus('success');
      setEmail('');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    }
  };

  return (
    <footer className="site-footer">
      {/* Features Bar */}
      <div className="footer-features">
        <div className="container">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-content">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* About & Newsletter Column */}
            <div className="footer-column footer-column-about">
              <Link to="/" className="footer-logo">
                <span className="logo-text">WorldStreet</span>
              </Link>
              <p className="footer-about">
                WorldStreet is your one-stop destination for quality electronics, 
                fashion, and lifestyle products at competitive prices. Shop with confidence.
              </p>
              
              {/* Newsletter */}
              <div className="footer-newsletter">
                <h4>Subscribe to our newsletter</h4>
                <p>Get the latest deals and offers</p>
                <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
                  <div className="newsletter-input-wrapper">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
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

            {/* Find It Fast Column */}
            <div className="footer-column">
              <h4 className="footer-title">Find It Fast</h4>
              <ul className="footer-links">
                {footerLinks.findItFast.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Care Column */}
            <div className="footer-column">
              <h4 className="footer-title">Customer Care</h4>
              <ul className="footer-links">
                {footerLinks.customerCare.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* About Us Column */}
            <div className="footer-column">
              <h4 className="footer-title">About Us</h4>
              <ul className="footer-links">
                {footerLinks.aboutUs.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>

              {/* Social Links */}
              <div className="footer-social">
                <h5>Follow Us</h5>
                <div className="social-links">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                    </svg>
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#fff" />
                    </svg>
                  </a>
                </div>
              </div>
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
              <Link to="/terms">Terms & Conditions</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/cookies">Cookie Policy</Link>
            </div>
            
            <div className="footer-payments">
              <span className="payments-label">We Accept:</span>
              <div className="payment-icons">
                <span className="payment-icon" title="Visa">
                  <svg viewBox="0 0 48 32" width="40" height="28">
                    <rect fill="#1A1F71" width="48" height="32" rx="4" />
                    <text x="24" y="20" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">VISA</text>
                  </svg>
                </span>
                <span className="payment-icon" title="Mastercard">
                  <svg viewBox="0 0 48 32" width="40" height="28">
                    <rect fill="#EB001B" width="48" height="32" rx="4" />
                    <circle cx="18" cy="16" r="10" fill="#EB001B" />
                    <circle cx="30" cy="16" r="10" fill="#F79E1B" />
                    <path d="M24 8a10 10 0 0 0 0 16 10 10 0 0 0 0-16z" fill="#FF5F00" />
                  </svg>
                </span>
                <span className="payment-icon" title="Paystack">
                  <svg viewBox="0 0 48 32" width="40" height="28">
                    <rect fill="#00C3F7" width="48" height="32" rx="4" />
                    <text x="24" y="18" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">Paystack</text>
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
