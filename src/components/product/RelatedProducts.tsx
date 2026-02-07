import { useRef, useState, useEffect } from 'react';
import type { Product } from '@/types/product.types';
import ProductCard from './ProductCard';
import { SkeletonProductCard } from '@/components/common/Skeleton';

interface RelatedProductsProps {
  products: Product[];
  title?: string;
  loading?: boolean;
  className?: string;
}

export default function RelatedProducts({
  products,
  title = 'You May Also Like',
  loading = false,
  className = '',
}: RelatedProductsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 280; // Approximate card width
    const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    checkScrollability();
  };

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className={`related-products ${className}`}>
      <div className="related-products-header">
        <h2 className="related-products-title">{title}</h2>
        
        {/* Navigation Arrows */}
        <div className="related-products-nav">
          <button
            type="button"
            className="related-products-nav-btn"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="related-products-nav-btn"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="related-products-scroll"
        onScroll={handleScroll}
      >
        <div className="related-products-track">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="related-products-item">
                  <SkeletonProductCard />
                </div>
              ))
            : products.map((product) => (
                <div key={product.id} className="related-products-item">
                  <ProductCard
                    product={product}
                    variant="grid"
                    showQuickView={false}
                  />
                </div>
              ))}
        </div>
      </div>

      {/* Scroll Indicators (Mobile) */}
      <div className="related-products-indicators">
        {products.map((_, index) => (
          <span
            key={index}
            className="related-products-indicator"
          />
        ))}
      </div>
    </section>
  );
}
