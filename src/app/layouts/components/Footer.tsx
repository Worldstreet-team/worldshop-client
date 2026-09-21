import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCategories } from "@/features/catalog/hooks/useCategories";

const FOOTER_CATEGORIES = 6;

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuth();
  const { categories } = useCategories();

  const departments = categories.filter(
    (c) => !c.parentId && categories.some((child) => child.parentId === c.id),
  );
  const shownDepartments = departments.slice(0, FOOTER_CATEGORIES);

  return (
    <footer className="ws-footer">
      <div className="ws-wrap">
        <div className="ws-footer__grid">
          <div className="ws-footer__brand">
            <Link to="/" className="ws-brand" aria-label="WorldStore home">
              <img
                src="/brand/wsa-mark.png"
                alt=""
                className="ws-brand__mark"
              />
              <span className="ws-brand__stack">
                <span className="ws-brand__word">WorldStore</span>
              </span>
            </Link>
            <p className="ws-footer__blurb">
              Buy and sell directly with sellers anywhere in the world. Browse
              listings, message the store, and agree your own terms.
            </p>
            <p className="ws-footer__blurb">
              Part of the{" "}
              <a
                href="https://dashboard.worldstreetgold.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                WorldStreet ecosystem
              </a>{" "}
              — one account across every platform.
            </p>
          </div>

          <nav aria-label="Marketplace">
            <h2 className="ws-label ws-footer__head">Marketplace</h2>
            <ul className="ws-footer__links">
              <li>
                <Link to="/listings">Browse listings</Link>
              </li>
              {isAuthenticated && (
                <li>
                  <Link to="/saved">Saved listings</Link>
                </li>
              )}
              <li>
                <Link to="/vendor/register">Open a store</Link>
              </li>
            </ul>
          </nav>

          {shownDepartments.length > 0 && (
            <nav aria-label="Categories">
              <h2 className="ws-label ws-footer__head">Categories</h2>
              <ul className="ws-footer__links">
                {shownDepartments.map((c) => (
                  <li key={c.id}>
                    <Link to={`/listings?categoryId=${c.id}`}>{c.name}</Link>
                  </li>
                ))}
                {departments.length > shownDepartments.length && (
                  <li>
                    <Link to="/listings" className="ws-footer__more">
                      All categories
                      <ArrowRight size={13} aria-hidden />
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          )}

          <nav aria-label="Account">
            <h2 className="ws-label ws-footer__head">Account</h2>
            <ul className="ws-footer__links">
              {isAuthenticated ? (
                <>
                  <li>
                    <Link to="/account">Your account</Link>
                  </li>
                  <li>
                    <Link to="/account/messages">Messages</Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/auth/login">Sign in</Link>
                </li>
              )}
            </ul>
          </nav>

          <nav aria-label="WorldStreet ecosystem">
            <h2 className="ws-label ws-footer__head">Ecosystem</h2>
            <ul className="ws-footer__links">
              <li>
                <a
                  href="https://dashboard.worldstreetgold.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="https://academy.worldstreetgold.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Academy
                </a>
              </li>
              <li>
                <a
                  href="https://xtreme.worldstreetgold.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Xstream
                </a>
              </li>
              <li>
                <a
                  href="https://social.worldstreetgold.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Social
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="ws-footer__base">
          <p>&copy; {currentYear} WorldStore</p>
          <nav aria-label="Legal" className="ws-footer__legal">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
