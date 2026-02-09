import { Link } from 'react-router-dom';
import type { Category } from '@/types/product.types';

// Map category slugs to icons (material icons)
const categoryIcons: Record<string, string> = {
  electronics: 'devices',
  fashion: 'checkroom',
  'home-garden': 'home',
  'sports-outdoors': 'fitness_center',
};

function getCategoryIcon(slug: string): string {
  return categoryIcons[slug] ?? 'category';
}

interface CategoryDropdownProps {
  categories: Category[];
  isOpen: boolean;
  isLoading: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onLinkClick?: () => void;
}

export default function CategoryDropdown({
  categories,
  isOpen,
  isLoading,
  onMouseEnter,
  onMouseLeave,
  onLinkClick,
}: CategoryDropdownProps) {
  if (!isOpen) return null;

  return (
    <div
      className="category-dropdown"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      aria-label="Category menu"
    >
      {isLoading ? (
        <div className="category-dropdown-loading">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="category-dropdown-skeleton" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="category-dropdown-empty">No categories yet</div>
      ) : (
        <ul className="category-dropdown-list">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                to={`/category/${cat.slug}`}
                className="category-dropdown-item"
                onClick={onLinkClick}
              >
                <span className="material-icons category-dropdown-icon">
                  {getCategoryIcon(cat.slug)}
                </span>
                <div className="category-dropdown-info">
                  <span className="category-dropdown-name">{cat.name}</span>
                  {cat.productCount !== undefined && (
                    <span className="category-dropdown-count">
                      {cat.productCount} {cat.productCount === 1 ? 'product' : 'products'}
                    </span>
                  )}
                </div>
                <svg className="category-dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="category-dropdown-footer">
        <Link to="/products" className="category-dropdown-viewall" onClick={onLinkClick}>
          Browse All Products
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

