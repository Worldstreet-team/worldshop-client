import type { Product } from '@/types/product.types';
import ProductCard from './ProductCard';
import { SkeletonProductCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common';

interface ProductGridProps {
  products: Product[];
  variant?: 'grid' | 'list';
  columns?: 2 | 3 | 4 | 5 | 6;
  loading?: boolean;
  loadingCount?: number;
  showQuickView?: boolean;
  showWishlist?: boolean;
  showAddToCart?: boolean;
  className?: string;
  onClearFilters?: () => void;
}

export default function ProductGrid({
  products,
  variant = 'grid',
  columns = 4,
  loading = false,
  loadingCount = 8,
  showQuickView = true,
  showWishlist = true,
  showAddToCart = true,
  className = '',
  onClearFilters,
}: ProductGridProps) {
  const gridClass = [
    'product-grid',
    `product-grid-${variant}`,
    `product-grid-cols-${columns}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: loadingCount }).map((_, index) => (
          <SkeletonProductCard key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="We couldn't find any products matching your selection. Try adjusting your filters or search terms."
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        actionLabel={onClearFilters ? "Clear All Filters" : undefined}
        onAction={onClearFilters}
        className="product-grid-empty"
      />
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={variant}
          showQuickView={showQuickView}
          showWishlist={showWishlist}
          showAddToCart={showAddToCart}
        />
      ))}
    </div>
  );
}
