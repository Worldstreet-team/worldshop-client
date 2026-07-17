import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProductCacheStore } from '@/store/productCacheStore';
import { useCategoryStore } from '@/store/categoryStore';
import { productService } from '@/services/productService';
import type { Product, ProductFilters as ProductFiltersType } from '@/types/product.types';
import { Breadcrumb, Pagination, Skeleton } from '@/components/common';
import {
  ProductGrid,
  ProductFilters,
  ProductSort,
  PriceRangeSlider,
  type SortOption,
} from '@/components/product';

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const productCache = useProductCacheStore();
  const categoryStore = useCategoryStore();

  const sortMap: Record<SortOption, string> = {
    newest: 'newest',
    popularity: 'rating',
    rating: 'rating',
    'price-asc': 'price_asc',
    'price-desc': 'price_desc',
    'name-asc': 'name_asc',
    'name-desc': 'name_desc',
  };

  // Parse URL params first
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSort = (searchParams.get('sort') || 'newest') as SortOption;
  const selectedCategory = searchParams.get('category') || '';
  const minPrice = searchParams.has('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.has('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const searchQuery = searchParams.get('q') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const selectedBrand = searchParams.get('brand') || '';
  const featuredOnly = searchParams.get('featured') === 'true';
  const saleOnly = searchParams.get('sale') === 'true';

  // Stale-while-revalidate: seed from cache if available
  const listFilters: ProductFiltersType = {
    categoryId: selectedCategory || undefined,
    minPrice: minPrice,
    maxPrice: maxPrice,
    search: searchQuery || undefined,
    inStock: inStock || undefined,
    brand: selectedBrand || undefined,
    isFeatured: featuredOnly || undefined,
    onSale: saleOnly || undefined,
    sortBy: sortMap[currentSort] as ProductFiltersType['sortBy'],
    page: currentPage,
    limit: 12,
  };
  const listKey = JSON.stringify(listFilters, Object.keys(listFilters).sort());
  const cachedList = useProductCacheStore.getState().productLists[listKey];

  const [products, setProducts] = useState<Product[]>(cachedList?.data.data ?? []);
  const [totalProducts, setTotalProducts] = useState(cachedList?.data.pagination.total ?? 0);
  const [totalPages, setTotalPages] = useState(cachedList?.data.pagination.totalPages ?? 1);
  const [isLoading, setIsLoading] = useState(!cachedList);
  const [categories, setCategories] = useState(categoryStore.categories);
  const [brands, setBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Create filters object for ProductFilters component
  const filters: ProductFiltersType = {
    categoryId: selectedCategory || undefined,
    minPrice: minPrice,
    maxPrice: maxPrice,
    inStock: inStock || undefined,
    brand: selectedBrand || undefined,
  };

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const promises: Promise<unknown>[] = [
          productCache.getPriceRange(),
        ];

        if (categoryStore.categories.length === 0) {
          promises.push(categoryStore.fetchCategories());
        }

        const results = await Promise.all(promises);
        const priceRangeData = results[0] as { min: number; max: number };

        const cats = useCategoryStore.getState().categories;
        setCategories(cats);
        setPriceRange(priceRangeData);

        productService
          .getBrands()
          .then(setBrands)
          .catch(() => {
            // Brand filter just stays hidden if the list can't load
          });
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await productCache.getProducts({
        categoryId: selectedCategory || undefined,
        minPrice: minPrice,
        maxPrice: maxPrice,
        search: searchQuery || undefined,
        inStock: inStock || undefined,
        brand: selectedBrand || undefined,
        isFeatured: featuredOnly || undefined,
        onSale: saleOnly || undefined,
        sortBy: sortMap[currentSort] as ProductFiltersType['sortBy'],
        page: currentPage,
        limit: 12,
      });

      setProducts(result.data);
      setTotalProducts(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, currentSort, selectedCategory, minPrice, maxPrice, searchQuery, inStock, selectedBrand, featuredOnly, saleOnly, productCache]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle page change
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort change
  const handleSortChange = (sort: SortOption) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sort);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  // Handle filter changes from ProductFilters component
  const handleFilterChange = (newFilters: Partial<ProductFiltersType>) => {
    const newParams = new URLSearchParams(searchParams);

    if (newFilters.categoryId !== undefined) {
      if (newFilters.categoryId) {
        newParams.set('category', newFilters.categoryId);
      } else {
        newParams.delete('category');
      }
    }

    if (newFilters.minPrice !== undefined) {
      if (newFilters.minPrice > 0) {
        newParams.set('minPrice', newFilters.minPrice.toString());
      } else {
        newParams.delete('minPrice');
      }
    }

    if (newFilters.maxPrice !== undefined) {
      if (newFilters.maxPrice < priceRange.max) {
        newParams.set('maxPrice', newFilters.maxPrice.toString());
      } else {
        newParams.delete('maxPrice');
      }
    }

    if (newFilters.inStock !== undefined) {
      if (newFilters.inStock) {
        newParams.set('inStock', 'true');
      } else {
        newParams.delete('inStock');
      }
    }

    if (newFilters.brand !== undefined) {
      if (newFilters.brand) {
        newParams.set('brand', newFilters.brand);
      } else {
        newParams.delete('brand');
      }
    }

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams({ page: '1' });
  };

  // Check if any filters are active
  const hasActiveFilters = selectedCategory || (minPrice !== undefined && minPrice > 0) || (maxPrice !== undefined && maxPrice < priceRange.max) || inStock || !!selectedBrand;

  const pageTitle = searchQuery
    ? `Search: "${searchQuery}"`
    : featuredOnly
      ? 'Featured Products'
      : saleOnly
        ? 'Deals & Sale'
        : 'Shop All Products';

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Shop' },
  ];

  return (
    <div className="product-listing-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="page-header">
          <h1>{pageTitle}</h1>
          <span className="results-count">
            {isLoading ? (
              <Skeleton width={150} height={20} />
            ) : (
              `Showing ${products.length} of ${totalProducts} products`
            )}
          </span>
        </div>

        {/* Mobile filter toggle */}
        <button
          className="mobile-filter-toggle"
          onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Filters {hasActiveFilters && <span className="filter-badge">!</span>}
        </button>

        <div className="product-listing-layout">
          {/* Filters Sidebar */}
          <aside className={`filters-sidebar ${isMobileFilterOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
              <h2>Filters</h2>
              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={handleClearFilters}>
                  Clear All
                </button>
              )}
              <button
                className="close-sidebar-btn"
                onClick={() => setIsMobileFilterOpen(false)}
              >
                ×
              </button>
            </div>

            <ProductFilters
              filters={filters}
              categories={categories}
              brands={brands}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              priceRange={priceRange}
              loading={isLoading}
            />

            {/* Additional Price Range Slider */}
            <div className="filter-section">
              <h3 className="filter-title">Price Range</h3>
              <PriceRangeSlider
                min={priceRange.min}
                max={priceRange.max}
                minValue={minPrice ?? priceRange.min}
                maxValue={maxPrice ?? priceRange.max}
                onChange={(min, max) => {
                  handleFilterChange({ minPrice: min, maxPrice: max });
                }}
              />
            </div>
          </aside>

          {/* Products Area */}
          <main className="products-area">
            {/* Sort Bar */}
            <div className="products-toolbar">
              <ProductSort
                value={currentSort}
                onChange={handleSortChange}
              />
            </div>

            {/* Product Grid */}
            <ProductGrid
              products={products}
              loading={isLoading}
              loadingCount={12}
              onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
            />

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
              <div className="pagination-wrapper">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
