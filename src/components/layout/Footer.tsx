import { Link } from 'react-router-dom';

/**
 * Footer. Two link columns only — this is a marketplace, not a storefront, so
 * there are no shipping, returns or payment pages to link to.
 */

const footerLinks = {
  marketplace: [
    { label: 'Browse listings', href: '/listings' },
    { label: 'Open a store', href: '/vendor/register' },
    { label: 'Seller dashboard', href: '/vendor' },
  ],
  account: [
    { label: 'Your account', href: '/account' },
    { label: 'Messages', href: '/account/messages' },
    { label: 'Sign in', href: '/auth/login' },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="ws-footer">
      <div className="ws-wrap">
        <div className="ws-footer__grid">
          <div>
            <Link to="/" className="ws-brand" aria-label="WorldShop home">
              <span className="ws-brand__eyebrow">Worldstreet</span>
              <span className="ws-brand__word">shop<span className="ws-brand__dot">.</span></span>
            </Link>
            <p className="ws-caption ws-muted" style={{ maxWidth: '42ch', marginTop: 'var(--ws-space-3)' }}>
              Buy and sell directly with sellers across Nigeria. Browse listings,
              message the store, and agree your own terms.
            </p>
          </div>

          <div>
            <h2 className="ws-label" style={{ marginBottom: 'var(--ws-space-3)' }}>Marketplace</h2>
            <ul className="ws-footer__links">
              {footerLinks.marketplace.map((link) => (
                <li key={link.href}><Link to={link.href}>{link.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="ws-label" style={{ marginBottom: 'var(--ws-space-3)' }}>Account</h2>
            <ul className="ws-footer__links">
              {footerLinks.account.map((link) => (
                <li key={link.href}><Link to={link.href}>{link.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ws-footer__base">
          <p>&copy; {currentYear} WorldStreet</p>
          <div style={{ display: 'flex', gap: 'var(--ws-space-4)' }}>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
