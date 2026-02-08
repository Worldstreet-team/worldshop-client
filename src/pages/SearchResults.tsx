import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import type { Product } from '@/types/product.types';
import { Breadcrumb, EmptyState } from '@/components/common';
import { ProductGrid } from '@/components/product';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setProducts([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const results = await productService.searchProducts(query, 20);
        setProducts(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch search results');
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [query]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Search Results' },
  ];

  return (
    <div className="search-results-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="search-header">
          <h1>Search Results</h1>
          {query && (
            <p>
              {isLoading
                ? `Searching for "${query}"...`
                : `${products.length} result${products.length !== 1 ? 's' : ''} for "${query}"`}
            </p>
          )}
        </div>

        {!query ? (
          <EmptyState
            icon="search"
            title="Enter a Search Term"
            description="Type a keyword to search for products."
          />
        ) : isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <EmptyState
            icon="error"
            title="Search Failed"
            description={error}
            actionLabel="Try Again"
            onAction={() => window.location.reload()}
          />
        ) : products.length > 0 ? (
          <ProductGrid products={products} loading={false} />
        ) : (
          <EmptyState
            icon="search"
            title="No Results Found"
            description={`We couldn't find any products matching "${query}". Try a different search term.`}
            actionLabel="Browse Shop"
            actionLink="/shop"
          />
        )}
      </div>
    </div>
  );
}
