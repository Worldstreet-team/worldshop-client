import { Link } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
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
          <Link to="/" onClick={closeMobileMenu}>
            <img src="/logo.svg" alt="WorldStreet" className="mobile-menu-logo" />
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
              <Link to="/" onClick={closeMobileMenu}>Home</Link>
            </li>
            <li>
              <Link to="/products" onClick={closeMobileMenu}>Shop</Link>
            </li>
            <li>
              <Link to="/category/electronics" onClick={closeMobileMenu}>Electronics</Link>
            </li>
            <li>
              <Link to="/category/fashion" onClick={closeMobileMenu}>Fashion</Link>
            </li>
            <li>
              <Link to="/category/home-garden" onClick={closeMobileMenu}>Home & Garden</Link>
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
