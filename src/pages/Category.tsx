import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { categoryService } from '@/services/productService';
import type { Product, Category as CategoryType } from '@/types/product.types';
import type { Pagination } from '@/types/common.types';
import { Breadcrumb, EmptyState } from '@/components/common';
import { ProductGrid, ProductSort, type SortOption } from '@/components/product';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [category, setCategory] = useState<CategoryType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSort = (searchParams.get('sort') || 'newest') as SortOption;

  const sortMap: Record<SortOption, string> = {
    newest: 'newest',
    popularity: 'popular',
    rating: 'rating',
    'price-asc': 'price_asc',
    'price-desc': 'price_desc',
    'name-asc': 'name_asc',
    'name-desc': 'name_desc',
  };

  const fetchCategory = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await categoryService.getCategoryBySlug(slug, {
        page: currentPage,
        limit: 12,
        sortBy: sortMap[currentSort] as 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'rating' | 'popular',
      });
      if (!result) {
        setError('Category not found');
        return;
      }
      setCategory(result.category);
      setProducts(result.products.data);
      setPagination(result.products.pagination);
    } catch (err) {
      console.error('Error fetching category:', err);
      setError('Failed to load category');
    } finally {
      setIsLoading(false);
    }
  }, [slug, currentPage, currentSort]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (sort: SortOption) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Categories', href: '/categories' },
    { label: category?.name || slug || '' },
  ];

  if (isLoading) {
    return (
      <div className="category-page">
        <div className="container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="category-page">
        <div className="container">
          <EmptyState
            icon="error"
            title="Category Not Found"
            description={error || 'The category you are looking for does not exist.'}
            actionLabel="Browse Categories"
            actionLink="/categories"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="category-header">
          <h1>{category.name}</h1>
          {category.description && <p>{category.description}</p>}
          {pagination && (
            <span className="product-count">{pagination.total} product{pagination.total !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Sub-categories */}
        {category.children && category.children.length > 0 && (
          <div className="sub-categories">
            {category.children.map((child) => (
              <a key={child.id} href={`/category/${child.slug}`} className="sub-category-chip">
                {child.name}
              </a>
            ))}
          </div>
        )}

        <div className="category-toolbar">
          <ProductSort value={currentSort} onChange={handleSortChange} />
        </div>

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} loading={false} />
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination-wrapper">
                <button
                  disabled={!pagination.hasPrevPage}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="pagination-btn"
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon="package"
            title="No Products Found"
            description="There are no products in this category yet."
            actionLabel="Browse All Products"
            actionLink="/shop"
          />
        )}
      </div>
    </div>
  );
}
