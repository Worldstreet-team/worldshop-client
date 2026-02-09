import { Link } from 'react-router-dom';
import type { Product } from '@/types/product.types';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import RatingStars from '@/components/common/RatingStars';
import { SaleBadge, NewBadge } from '@/components/common/Badge';

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'list';
  showQuickView?: boolean;
  showWishlist?: boolean;
  showAddToCart?: boolean;
  className?: string;
}

export default function ProductCard({
  product,
  variant = 'grid',
  showQuickView = true,
  showWishlist = true,
  showAddToCart = true,
  className = '',
}: ProductCardProps) {
  const { addToCart, isInCart } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();

  const inWishlist = isInWishlist(product.id);
  const inCart = isInCart(product.id);

  const discountPercentage = product.salePrice
    ? Math.round(((product.basePrice - product.salePrice) / product.basePrice) * 100)
    : 0;

  const isNew = product.createdAt
    ? new Date(product.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : false;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart({
      productId: product.id,
      quantity: 1,
    });
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product.id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const inStock = product.stock > 0;

  const cardClass = [
    'product-card',
    `product-card-${variant}`,
    !inStock ? 'product-card-out-of-stock' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      <Link to={`/products/${product.slug}`} className="product-card-link">
        {/* Image Container */}
        <div className="product-card-image-wrapper">
          <img
            src={product.images[0]?.url || '/images/placeholder-product.png'}
            alt={product.images[0]?.alt || product.name}
            className="product-card-image"
            loading="lazy"
          />

          {/* Badges */}
          <div className="product-card-badges">
            {discountPercentage > 0 && <SaleBadge percentage={discountPercentage} />}
            {isNew && <NewBadge />}
          </div>

          {/* Hover Actions */}
          <div className="product-card-actions">
            {showWishlist && (
              <button
                type="button"
                className={`product-card-action ${inWishlist ? 'active' : ''}`}
                onClick={handleWishlistToggle}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <svg viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {showQuickView && (
              <button
                type="button"
                className="product-card-action"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // TODO: Implement quick view modal
                }}
                aria-label="Quick view"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
          </div>

          {/* Out of Stock Overlay */}
          {!inStock && (
            <div className="product-card-overlay">
              <span>Out of Stock</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="product-card-content">
          {/* Category */}
          {product.category && (
            <span className="product-card-category">{product.category.name}</span>
          )}

          {/* Name */}
          <h3 className="product-card-name">{product.name}</h3>

          {/* Rating */}
          {product.avgRating !== undefined && (
            <RatingStars
              rating={product.avgRating}
              size="sm"
              reviewCount={product.reviewCount}
            />
          )}

          {/* Price */}
          <div className="product-card-price">
            <span className="product-card-price-current">{formatPrice(product.salePrice ?? product.basePrice)}</span>
            {product.salePrice && product.salePrice < product.basePrice && (
              <span className="product-card-price-original">
                {formatPrice(product.basePrice)}
              </span>
            )}
          </div>

          {/* Description (List variant only) */}
          {variant === 'list' && product.description && (
            <p className="product-card-description">{product.description}</p>
          )}

          {/* Add to Cart Button */}
          {showAddToCart && inStock && (
            <button
              type="button"
              className={`product-card-add-to-cart ${inCart ? 'in-cart' : ''}`}
              onClick={handleAddToCart}
              disabled={!!inCart}
            >
              {inCart ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>In Cart</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          )}
        </div>
      </Link>
    </article>
  );
}
