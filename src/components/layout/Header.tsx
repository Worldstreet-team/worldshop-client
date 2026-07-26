import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useCategoryStore } from '@/store/categoryStore';
import CategoryDropdown from './MegaMenu';

/**
 * Marketplace header.
 *
 * The ecommerce version carried a cart button, a wishlist badge and sale
 * tabs — furniture for a shop that transacted on-platform. Nothing is bought
 * here any more, so the header's two jobs are search and "sell here": search
 * feeds the browse page, and the Sell link is the supply side's front door.
 */

const navLinks = [
  { to: '/listings', label: 'Marketplace' },
  { to: '/vendor', label: 'Sell on WorldStreet', isSale: true },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { toggleMobileMenu } = useUIStore();
  const { categories, isLoading: categoriesLoading, fetchCategories } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleDropdownEnter = useCallback(() => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setIsCategoryDropdownOpen(true);
  }, []);

  const handleDropdownLeave = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsCategoryDropdownOpen(false);
    }, 150);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsCategoryDropdownOpen(false);
  }, []);

  const isActiveLink = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to.split('?')[0]);
  };

  return (
    <header className={`site-header ${isScrolled ? 'header-scrolled' : ''}`}>
      {/* ─── Row 1: Logo + Search + Icons ─── */}
      <div className="header-main">
        <div className="container">
          {/* Logo + Hamburger */}
          <div className="header-logo-group">
            <Link to="/" className="header-logo">
              <img
                src="/images/worldstreet-mark.png"
                alt="WorldStreet"
                className="logo-icon"
                width="36"
                height="36"
              />
              <span className="logo-text">WorldStreet<span className="logo-dot">.</span></span>
            </Link>
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Open navigation menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Search Bar — Desktop */}
          <div className="header-search desktop-search">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the marketplace"
                className="search-input"
                aria-label="Search listings"
              />
              <button type="submit" className="search-btn" aria-label="Submit search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>

          {/* Header Action Icons */}
          <div className="header-icons">
            {/* Mobile Search Toggle */}
            <button
              className="header-icon-btn mobile-search-toggle"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Toggle search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Messages — the marketplace's core interaction */}
            {isAuthenticated && (
              <Link
                to="/account/messages"
                className="header-icon-btn icon-muted"
                aria-label="Messages"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}

            {/* Account */}
            <Link
              to="/account"
              className="header-icon-btn account-btn"
              aria-label={isAuthenticated ? 'Account' : 'Sign In'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {isAuthenticated && (
                <span className="user-name">{user?.firstName}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Row 2: Departments + Nav ─── */}
      <div className="header-bottom">
        <div className="container">
          {/* All Departments Dropdown */}
          <div
            className="nav-categories-trigger"
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className="categories-btn"
              aria-expanded={isCategoryDropdownOpen}
              aria-haspopup="true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Categories</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" className="chevron">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <CategoryDropdown
              categories={categories}
              isOpen={isCategoryDropdownOpen}
              isLoading={categoriesLoading}
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
              onLinkClick={closeDropdown}
            />
          </div>

          {/* Secondary Nav Links */}
          <nav className="header-nav-inline">
            <ul className="nav-menu">
              {navLinks.map((link) => (
                <li key={link.to} className="nav-item">
                  <Link
                    to={link.to}
                    className={`nav-link ${isActiveLink(link.to) ? 'active' : ''} ${link.isSale ? 'nav-link-sale' : ''}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAuthenticated && user?.role === 'ADMIN' && (
                <li className="nav-item">
                  <Link
                    to="/admin"
                    className={`nav-link nav-link-admin ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                  >
                    Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* Main Dashboard Link */}
          <a
            href="https://dashboard.worldstreetgold.com"
            className="header-dashboard-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Main Dashboard
          </a>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className={`header-mobile-search ${isSearchOpen ? 'open' : ''}`}>
        <div className="container">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the marketplace"
              className="search-input"
            />
            <button type="submit" className="search-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="search-close"
              onClick={() => setIsSearchOpen(false)}
              aria-label="Close search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
