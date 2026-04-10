import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { storeService } from '@/services/productService';
import type { Product, StoreInfo } from '@/types/product.types';
import type { Pagination } from '@/types/common.types';
import { Breadcrumb, EmptyState } from '@/components/common';
import { ProductGrid, ProductSort, type SortOption } from '@/components/product';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [store, setStore] = useState<StoreInfo | null>(null);
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

  const fetchStore = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await storeService.getStoreBySlug(slug, {
        page: currentPage,
        limit: 12,
        sortBy: sortMap[currentSort] as 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | 'newest' | 'rating' | 'popular',
      });
      if (!result) {
        setError('Store not found');
        return;
      }
      setStore(result.store);
      setProducts(result.products.data);
      setPagination(result.products.pagination);
    } catch (err) {
      console.error('Error fetching store:', err);
      setError('Failed to load store');
    } finally {
      setIsLoading(false);
    }
  }, [slug, currentPage, currentSort]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

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
    { label: 'Store' },
    { label: store?.storeName || slug || '' },
  ];

  if (isLoading) {
    return (
      <div className="store-page">
        <div className="container">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="store-page">
        <div className="container">
          <EmptyState
            icon="error"
            title="Store Not Found"
            description={error || 'The store you are looking for does not exist.'}
            actionLabel="Browse Products"
            actionLink="/shop"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="store-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="store-header">
          <h1>{store.storeName}</h1>
          {store.storeDescription && <p className="store-description">{store.storeDescription}</p>}
          <span className="product-count">
            {store.productCount} product{store.productCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="store-toolbar">
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
            title="No Products Yet"
            description="This store doesn't have any products yet. Check back later!"
            actionLabel="Browse All Products"
            actionLink="/shop"
          />
        )}
      </div>
    </div>
  );
}
