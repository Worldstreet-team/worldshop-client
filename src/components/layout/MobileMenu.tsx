import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useCategoryStore } from '@/store/categoryStore';

// Map category slugs to icons (material icons)
const categoryIcons: Record<string, string> = {
  electronics: 'devices',
  fashion: 'checkroom',
  'home-garden': 'home',
  'sports-outdoors': 'fitness_center',
};

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isMobileMenuOpen) {
      fetchCategories();
    }
  }, [isMobileMenuOpen, fetchCategories]);

  const handleLogout = async () => {
    await signOut();
    logout();
    closeMobileMenu();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <Link to="/" onClick={closeMobileMenu} className="mobile-menu-brand">
            <img src="/images/worldstreet-mark.png" alt="WorldStreet" className="mobile-menu-logo" width="32" height="32" />
            <span className="mobile-menu-brand-text">WorldStreet<span className="logo-dot">.</span></span>
          </Link>
          <button
            className="close-btn"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* User Info */}
        {isAuthenticated && (
          <div className="mobile-menu-user">
            <span className="material-icons">account_circle</span>
            <span>Hi, {user?.firstName}</span>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="mobile-menu-nav">
          <ul>
            <li>
              <Link to="/" onClick={closeMobileMenu}>
                <span className="material-icons">home</span>
                Home
              </Link>
            </li>
            <li>
              <Link to="/products" onClick={closeMobileMenu}>
                <span className="material-icons">storefront</span>
                Shop
              </Link>
            </li>
            <li>
              <a href="https://dashboard.worldstreetgold.com" target="_blank" rel="noopener noreferrer">
                <span className="material-icons">dashboard</span>
                Main Dashboard
              </a>
            </li>
          </ul>

          {/* Categories */}
          {categories.length > 0 && (
            <>
              <div className="mobile-menu-section-title">Categories</div>
              <ul>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/category/${cat.slug}`} onClick={closeMobileMenu}>
                      <span className="material-icons">
                        {categoryIcons[cat.slug] ?? 'category'}
                      </span>
                      {cat.name}
                      {cat.productCount !== undefined && (
                        <span className="mobile-menu-badge">{cat.productCount}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          <hr className="mobile-menu-divider" />

          <ul>
            <li>
              <Link to="/products?featured=true" onClick={closeMobileMenu}>
                <span className="material-icons">star</span>
                Featured
              </Link>
            </li>
            <li>
              <Link to="/products?sale=true" onClick={closeMobileMenu}>
                <span className="material-icons mobile-menu-sale-icon">local_offer</span>
                Sale
              </Link>
            </li>
          </ul>

          <hr className="mobile-menu-divider" />

          <ul>
            {isAuthenticated ? (
              <>
                <li>
                  <Link to="/account" onClick={closeMobileMenu}>
                    <span className="material-icons">person</span>
                    My Account
                  </Link>
                </li>
                <li>
                  <Link to="/account/orders" onClick={closeMobileMenu}>
                    <span className="material-icons">shopping_bag</span>
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to="/account/wishlist" onClick={closeMobileMenu}>
                    <span className="material-icons">favorite</span>
                    Wishlist
                  </Link>
                </li>
                <li>
                  <button onClick={handleLogout} className="mobile-menu-logout">
                    <span className="material-icons">logout</span>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/auth/login" onClick={closeMobileMenu}>
                    <span className="material-icons">login</span>
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/auth/register" onClick={closeMobileMenu}>
                    <span className="material-icons">person_add</span>
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </>
  );
}
