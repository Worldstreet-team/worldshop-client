import { useState, useCallback } from 'react';
import type { ProductFilters as ProductFiltersType, Category } from '@/types/product.types';
import Checkbox from '@/components/common/Checkbox';
import Button from '@/components/common/Button';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  categories: Category[];
  onFilterChange: (filters: Partial<ProductFiltersType>) => void;
  onClearFilters: () => void;
  priceRange?: { min: number; max: number };
  loading?: boolean;
  className?: string;
}

export default function ProductFilters({
  filters,
  categories,
  onFilterChange,
  onClearFilters,
  priceRange = { min: 0, max: 10000 },
  loading = false,
  className = '',
}: ProductFiltersProps) {
  const [localPriceMin, setLocalPriceMin] = useState(filters.minPrice?.toString() || '');
  const [localPriceMax, setLocalPriceMax] = useState(filters.maxPrice?.toString() || '');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
    availability: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = useCallback(
    (categoryId: string, checked: boolean) => {
      const currentCategories = filters.categoryId ? [filters.categoryId] : [];
      const newCategories = checked
        ? [...currentCategories, categoryId]
        : currentCategories.filter((id) => id !== categoryId);

      onFilterChange({ categoryId: newCategories[0] || undefined });
    },
    [filters.categoryId, onFilterChange]
  );

  const handlePriceApply = () => {
    onFilterChange({
      minPrice: localPriceMin ? parseFloat(localPriceMin) : undefined,
      maxPrice: localPriceMax ? parseFloat(localPriceMax) : undefined,
    });
  };

  const handleInStockChange = (checked: boolean) => {
    onFilterChange({ inStock: checked || undefined });
  };

  const hasActiveFilters =
    filters.categoryId ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock;

  return (
    <aside className={`product-filters ${className}`}>
      {/* Header */}
      <div className="product-filters-header">
        <h2 className="product-filters-title">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            className="product-filters-clear"
            onClick={onClearFilters}
            disabled={loading}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="product-filters-section">
        <button
          type="button"
          className="product-filters-section-header"
          onClick={() => toggleSection('categories')}
          aria-expanded={expandedSections.categories}
        >
          <span>Categories</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
            className={expandedSections.categories ? 'rotated' : ''}
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {expandedSections.categories && (
          <div className="product-filters-section-content">
            {categories.map((category) => (
              <Checkbox
                key={category.id}
                label={category.name}
                checked={filters.categoryId === category.id}
                onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                disabled={loading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="product-filters-section">
        <button
          type="button"
          className="product-filters-section-header"
          onClick={() => toggleSection('price')}
          aria-expanded={expandedSections.price}
        >
          <span>Price</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
            className={expandedSections.price ? 'rotated' : ''}
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {expandedSections.price && (
          <div className="product-filters-section-content">
            <div className="product-filters-price-range">
              <div className="product-filters-price-inputs">
                <div className="product-filters-price-input">
                  <label htmlFor="price-min">Min</label>
                  <input
                    id="price-min"
                    type="number"
                    min={priceRange.min}
                    max={priceRange.max}
                    value={localPriceMin}
                    onChange={(e) => setLocalPriceMin(e.target.value)}
                    placeholder="0"
                    disabled={loading}
                  />
                </div>
                <span className="product-filters-price-separator">-</span>
                <div className="product-filters-price-input">
                  <label htmlFor="price-max">Max</label>
                  <input
                    id="price-max"
                    type="number"
                    min={priceRange.min}
                    max={priceRange.max}
                    value={localPriceMax}
                    onChange={(e) => setLocalPriceMax(e.target.value)}
                    placeholder="10000"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePriceApply}
                disabled={loading}
                fullWidth
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="product-filters-section">
        <button
          type="button"
          className="product-filters-section-header"
          onClick={() => toggleSection('availability')}
          aria-expanded={expandedSections.availability}
        >
          <span>Availability</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
            className={expandedSections.availability ? 'rotated' : ''}
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {expandedSections.availability && (
          <div className="product-filters-section-content">
            <Checkbox
              label="In Stock Only"
              checked={!!filters.inStock}
              onChange={(e) => handleInStockChange(e.target.checked)}
              disabled={loading}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
