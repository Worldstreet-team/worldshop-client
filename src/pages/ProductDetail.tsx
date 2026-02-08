import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { reviewApi } from '@/services/mockApi';
import type { Product, Review } from '@/types/product.types';
import { Breadcrumb, Skeleton, SkeletonText, EmptyState } from '@/components/common';
import {
  ProductGallery,
  ProductInfo,
  ProductReviews,
  ReviewForm,
  RelatedProducts,
  type ReviewFormData,
} from '@/components/product';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<{
    averageRating: number;
    totalReviews: number;
    distribution: { rating: number; count: number; percentage: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;

      setIsLoading(true);
      try {
        const data = await productService.getProductBySlug(slug);
        setProduct(data);

        // Fetch related products
        if (data) {
          setRelatedLoading(true);
          const related = await productService.getRelatedProducts(data.id, 8);
          setRelatedProducts(related);
          setRelatedLoading(false);

          // Fetch review summary and reviews
          const [summary, reviewsResult] = await Promise.all([
            reviewApi.getSummary(data.id),
            reviewApi.getByProductId(data.id, { sortBy: 'newest' }, 1, 10),
          ]);
          setReviewSummary(summary);
          setReviews(reviewsResult.data);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  // Handle review submission
  const handleReviewSubmit = async (data: ReviewFormData) => {
    if (!product) return;

    try {
      const newReview = await reviewApi.create({
        productId: product.id,
        ...data,
      });

      // Add to reviews list
      setReviews(prev => [newReview, ...prev]);

      // Refresh summary
      const summary = await reviewApi.getSummary(product.id);
      setReviewSummary(summary);

      // Switch to reviews tab
      setActiveTab('reviews');
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    ...(product?.category ? [{ label: product.category.name, href: `/category/${product.category.slug}` }] : []),
    { label: product?.name || 'Loading...' },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="breadcrumb-skeleton" style={{ marginBottom: '2rem' }}>
            <Skeleton width={300} height={20} />
          </div>

          <div className="product-detail-layout">
            <div className="product-gallery-skeleton">
              <Skeleton width="100%" height={500} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} width={80} height={80} />
                ))}
              </div>
            </div>

            <div className="product-info-skeleton">
              <div style={{ marginBottom: '0.5rem' }}>
                <Skeleton width={120} height={20} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <Skeleton width="80%" height={32} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <Skeleton width={150} height={20} />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <Skeleton width={200} height={40} />
              </div>
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: 'Product Not Found' }]} />
          <div style={{ padding: '4rem 0' }}>
            <EmptyState
              title="Product not found"
              description="The product you are looking for does not exist or has been removed."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                  <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              actionLabel="Return to Shop"
              actionLink="/shop"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <div className="product-detail-layout">
          <ProductGallery
            images={product.images}
            productName={product.name}
          />

          <ProductInfo
            product={product}
          />
        </div>

        {/* Product Tabs */}
        <section className="product-tabs">
          <div className="tabs-header">
            <button
              className={`tab-button ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button
              className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({reviewSummary?.totalReviews || 0})
            </button>
          </div>

          <div className="tabs-content">
            {activeTab === 'description' && (
              <div className="tab-panel description-panel">
                <div className="product-description">
                  <h3>About this product</h3>
                  <p>{product.description}</p>

                  {product.tags && product.tags.length > 0 && (
                    <div className="product-tags">
                      <h4>Tags</h4>
                      <div className="tags-list">
                        {product.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && reviewSummary && (
              <div className="tab-panel reviews-panel">
                <ProductReviews
                  reviews={reviews}
                  averageRating={reviewSummary.averageRating}
                  totalCount={reviewSummary.totalReviews}
                  onWriteReview={() => { }}
                />

                <div className="review-form-section">
                  <h3>Write a Review</h3>
                  <ReviewForm
                    productName={product.name}
                    onSubmit={handleReviewSubmit}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Products */}
        <RelatedProducts
          products={relatedProducts}
          loading={relatedLoading}
          title="You May Also Like"
        />
      </div>
    </div>
  );
}
