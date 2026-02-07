import { Link } from 'react-router-dom';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories?: SubCategory[];
  image?: string;
}

interface MegaMenuProps {
  categories: Category[];
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function MegaMenu({
  categories,
  isOpen,
  onMouseEnter,
  onMouseLeave,
}: MegaMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="mega-menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      aria-label="Category menu"
    >
      <div className="mega-menu-container">
        {/* Categories List */}
        <div className="mega-menu-categories">
          {categories.map((category) => (
            <div key={category.id} className="mega-menu-category">
              <Link
                to={`/category/${category.slug}`}
                className="mega-menu-category-title"
              >
                {category.name}
              </Link>
              {category.subcategories && category.subcategories.length > 0 && (
                <ul className="mega-menu-subcategories">
                  {category.subcategories.map((sub) => (
                    <li key={sub.id}>
                      <Link to={`/category/${sub.slug}`} className="mega-menu-link">
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Featured/Promo Section */}
        <div className="mega-menu-featured">
          <div className="mega-menu-promo">
            <div className="promo-content">
              <span className="promo-tag">Hot Deal</span>
              <h3>Up to 50% Off</h3>
              <p>On selected electronics</p>
              <Link to="/products?sale=true" className="promo-btn">
                Shop Now
              </Link>
            </div>
            <div className="promo-image">
              <img
                src="/images/300X300/img10.png"
                alt="Electronics Sale"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* View All Link */}
      <div className="mega-menu-footer">
        <Link to="/products" className="view-all-link">
          View All Categories
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
