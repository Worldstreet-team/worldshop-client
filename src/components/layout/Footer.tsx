import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCategoryStore } from '@/store/categoryStore';

/**
 * Footer. Marketplace + category + account columns — no shipping, returns or
 * payment pages because nothing is bought on-platform. Categories come from
 * the same store the header fills, so no extra fetch happens here.
 */

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuthStore();
  const { categories } = useCategoryStore();

  const departments = categories.filter(
    (c) => !c.parentId && categories.some((child) => child.parentId === c.id),
  );

  return (
    <footer className="ws-footer">
      <div className="ws-wrap">
        <div className="ws-footer__grid">
          <div>
            <Link to="/" className="ws-brand" aria-label="WorldStreet Shop home">
              {/* Unified ecosystem lockup (05-screens): gold wsa-mark 26px +
                  "WorldStreet" Poppins SemiBold 15 + gold app eyebrow. */}
              <img src="/brand/wsa-mark.png" alt="" className="ws-brand__mark" />
              <span className="ws-brand__stack">
                <span className="ws-brand__word">WorldStreet</span>
                <span className="ws-brand__eyebrow">Shop</span>
              </span>
            </Link>
            <p className="ws-caption ws-muted ws-footer__blurb">
              Buy and sell directly with sellers across Nigeria. Browse listings,
              message the store, and agree your own terms.
            </p>
            <p className="ws-caption ws-muted ws-footer__blurb">
              Part of the{' '}
              <a href="https://dashboard.worldstreetgold.com" target="_blank" rel="noopener noreferrer">
                WorldStreet ecosystem
              </a>
              — one account across every platform.
            </p>
          </div>

          <nav aria-label="Marketplace">
            <h2 className="ws-label ws-footer__head">Marketplace</h2>
            <ul className="ws-footer__links">
              <li><Link to="/listings">Browse listings</Link></li>
              <li><Link to="/saved">Saved listings</Link></li>
              <li><Link to="/vendor/register">Open a store</Link></li>
            </ul>
          </nav>

          {departments.length > 0 && (
            <nav aria-label="Categories">
              <h2 className="ws-label ws-footer__head">Categories</h2>
              <ul className="ws-footer__links">
                {departments.map((c) => (
                  <li key={c.id}>
                    <Link to={`/listings?categoryId=${c.id}`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-label="Account">
            <h2 className="ws-label ws-footer__head">Account</h2>
            <ul className="ws-footer__links">
              {isAuthenticated ? (
                <>
                  <li><Link to="/account">Your account</Link></li>
                  <li><Link to="/account/messages">Messages</Link></li>
                </>
              ) : (
                <li><Link to="/auth/login">Sign in</Link></li>
              )}
            </ul>
          </nav>

          {/* Cross-app link set per the DS TopNav spec (Dashboard · Academy ·
              Xstream · Social — Shop is this app). Same subdomain family the
              vendor console already links to. */}
          <nav aria-label="WorldStreet ecosystem">
            <h2 className="ws-label ws-footer__head">Ecosystem</h2>
            <ul className="ws-footer__links">
              <li>
                <a href="https://dashboard.worldstreetgold.com" target="_blank" rel="noopener noreferrer">Dashboard</a>
              </li>
              <li>
                <a href="https://academy.worldstreetgold.com" target="_blank" rel="noopener noreferrer">Academy</a>
              </li>
              <li>
                <a href="https://xtreme.worldstreetgold.com" target="_blank" rel="noopener noreferrer">Xstream</a>
              </li>
              <li>
                <a href="https://social.worldstreetgold.com" target="_blank" rel="noopener noreferrer">Social</a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="ws-footer__base">
          <p>&copy; {currentYear} WorldStreet</p>
          <nav aria-label="Legal" className="ws-footer__legal">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
          </nav>
          <button
            type="button"
            className="ws-footer__top"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Back to top
            <ArrowUp size={14} aria-hidden />
          </button>
        </div>
      </div>
    </footer>
  );
}
