import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import MegaMenu from './MegaMenu';

// Mock categories - replace with API data
const categories = [
  {
    id: '1',
    name: 'Electronics',
    slug: 'electronics',
    subcategories: [
      { id: '1-1', name: 'Smartphones', slug: 'smartphones' },
      { id: '1-2', name: 'Laptops', slug: 'laptops' },
      { id: '1-3', name: 'Audio', slug: 'audio' },
      { id: '1-4', name: 'Cameras', slug: 'cameras' },
    ],
  },
  {
    id: '2',
    name: 'Fashion',
    slug: 'fashion',
    subcategories: [
      { id: '2-1', name: "Men's Clothing", slug: 'mens-clothing' },
      { id: '2-2', name: "Women's Clothing", slug: 'womens-clothing' },
      { id: '2-3', name: 'Shoes', slug: 'shoes' },
      { id: '2-4', name: 'Accessories', slug: 'accessories' },
    ],
  },
  {
    id: '3',
    name: 'Home & Garden',
    slug: 'home-garden',
    subcategories: [
      { id: '3-1', name: 'Furniture', slug: 'furniture' },
      { id: '3-2', name: 'Decor', slug: 'decor' },
      { id: '3-3', name: 'Kitchen', slug: 'kitchen' },
      { id: '3-4', name: 'Garden', slug: 'garden' },
    ],
  },
];

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { getItemCount: getWishlistCount } = useWishlistStore();
  const { toggleMobileMenu, openCartSidebar } = useUIStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cartItemCount = getItemCount();
  const wishlistCount = getWishlistCount();

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Focus search input when opened on mobile
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleMegaMenuEnter = useCallback(() => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    setIsMegaMenuOpen(true);
  }, []);

  const handleMegaMenuLeave = useCallback(() => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 150);
  }, []);

  return (
    <header className={`site-header ${isScrolled ? 'header-scrolled' : ''}`}>
      {/* Top Bar */}
      <div className="header-top-bar">
        <div className="container">
          <div className="top-bar-left">
            <span className="welcome-text">Welcome to WorldStreet Shop</span>
            <div className="top-bar-links">
              <a href="/store-locator">Store Locator</a>
              <a href="/track-order">Track Order</a>
            </div>
          </div>
          <div className="top-bar-right">
            {isAuthenticated ? (
              <div className="user-menu">
                <Link to="/account" className="user-greeting">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Hi, {user?.firstName}</span>
                </Link>
              </div>
            ) : (
              <div className="auth-links">
                <Link to="/auth/login">Sign In</Link>
                <span className="separator">/</span>
                <Link to="/auth/register">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="header-main">
        <div className="container">
          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="header-logo">
            <span className="logo-text">WorldStreet</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="header-search desktop-search">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more..."
                className="search-input"
                aria-label="Search products"
              />
              <button type="submit" className="search-btn" aria-label="Submit search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>

          {/* Header Icons */}
          <div className="header-icons">
            {/* Mobile Search Toggle */}
            <button
              className="header-icon-btn mobile-search-toggle"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Toggle search"
              aria-expanded={isSearchOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Wishlist */}
            <Link to={isAuthenticated ? '/account/wishlist' : '/auth/login'} className="header-icon-btn wishlist-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {wishlistCount > 0 && <span className="icon-badge">{wishlistCount}</span>}
              <span className="icon-label">Wishlist</span>
            </Link>

            {/* Cart */}
            <button
              className="header-icon-btn cart-btn"
              onClick={openCartSidebar}
              aria-label={`Shopping cart with ${cartItemCount} items`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {cartItemCount > 0 && <span className="icon-badge">{cartItemCount}</span>}
              <span className="icon-label">Cart</span>
            </button>

            {/* Account */}
            <Link
              to={isAuthenticated ? '/account' : '/auth/login'}
              className="header-icon-btn account-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="icon-label">{isAuthenticated ? 'Account' : 'Sign In'}</span>
            </Link>
          </div>
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
              placeholder="Search products..."
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

      {/* Navigation */}
      <nav className="header-nav">
        <div className="container">
          {/* Categories Dropdown Trigger */}
          <div
            className="nav-categories-trigger"
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
          >
            <button
              className="categories-btn"
              aria-expanded={isMegaMenuOpen}
              aria-haspopup="true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>All Categories</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="chevron">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <MegaMenu
              categories={categories}
              isOpen={isMegaMenuOpen}
              onMouseEnter={handleMegaMenuEnter}
              onMouseLeave={handleMegaMenuLeave}
            />
          </div>

          {/* Main Navigation Links */}
          <ul className="nav-menu">
            <li className="nav-item">
              <Link to="/" className="nav-link">Home</Link>
            </li>
            <li className="nav-item">
              <Link to="/products" className="nav-link">Shop</Link>
            </li>
            <li className="nav-item">
              <Link to="/products?featured=true" className="nav-link">Featured</Link>
            </li>
            <li className="nav-item">
              <Link to="/products?sale=true" className="nav-link nav-link-sale">Sale</Link>
            </li>
          </ul>

          {/* Right side contact/help */}
          <div className="nav-contact">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Call: 1-800-WORLDST</span>
          </div>
        </div>
      </nav>
    </header>
  );
}
