import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product, ProductVariant } from '@/types/product.types';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/store/uiStore';
import { useWishlistStore } from '@/store/wishlistStore';
import RatingStars from '@/components/common/RatingStars';
import Badge, { SaleBadge } from '@/components/common/Badge';
import ProductQuantityInput from './ProductQuantityInput';
import ProductVariantSelector from './ProductVariantSelector';

interface ProductInfoProps {
  product: Product;
  className?: string;
}

export default function ProductInfo({ product, className = '' }: ProductInfoProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const { addToCart } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();

  const inWishlist = isInWishlist(product.id);

  // Get current price and stock based on variant or product
  const currentPrice = selectedVariant?.price ?? product.salePrice ?? product.basePrice;
  const originalPrice = product.salePrice ? product.basePrice : (selectedVariant?.compareAtPrice ?? undefined);
  const currentStock = selectedVariant?.stock ?? product.stock;
  const inStock = currentStock > 0;

  // Calculate discount percentage
  const discountPercentage =
    originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const handleAddToCart = async () => {
    if (isAddingToCart || isBuyingNow) return;
    setIsAddingToCart(true);
    try {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity,
      });
      toast.success('Added to cart');
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (isBuyingNow || isAddingToCart) return;
    setIsBuyingNow(true);
    try {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant?.id,
        quantity,
      });
      // Navigate to checkout
      window.location.href = '/checkout';
    } catch (error) {
      toast.error((error as { message?: string }).message || 'Failed to add to cart');
    } finally {
      setIsBuyingNow(false);
    }
  };

  const handleWishlistToggle = async () => {
    if (inWishlist) {
      await removeFromWishlist(product.id);
    } else {
      await addToWishlist(product.id);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.shortDesc || product.description,
          url: window.location.href,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
  };

  return (
    <div className={`product-info ${className}`}>
      {/* Header: Category, Title, Rating */}
      <div className="product-info-header">
        {product.category && (
          <span className="product-info-category">{product.category.name}</span>
        )}
        <h1 className="product-info-title">{product.name}</h1>

        <div className="product-info-meta">
          <RatingStars
            rating={product.avgRating}
            size="md"
            reviewCount={product.reviewCount}
          />
          {product.stockKeepingUnit && (
            <span className="product-info-sku">SKU: {product.stockKeepingUnit}</span>
          )}
        </div>

        {/* Vendor Attribution */}
        {product.vendor && (
          <div className="product-info-vendor">
            Sold by{' '}
            <Link to={`/store/${product.vendor.storeSlug}`} className="product-info-vendor-link">
              {product.vendor.storeName}
            </Link>
          </div>
        )}
      </div>

      {/* Price Section */}
      <div className="product-info-price">
        <span className="product-info-price-current">{formatPrice(currentPrice)}</span>
        {originalPrice && originalPrice > currentPrice && (
          <>
            <span className="product-info-price-original">
              {formatPrice(originalPrice)}
            </span>
            <SaleBadge percentage={discountPercentage} />
          </>
        )}
      </div>

      {/* Stock Status */}
      <div className="product-info-stock">
        {product.type === 'DIGITAL' ? (
          <Badge variant="info" size="sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Digital Product
          </Badge>
        ) : inStock ? (
          <Badge variant="success" size="sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            In Stock
          </Badge>
        ) : (
          <Badge variant="danger" size="sm">Out of Stock</Badge>
        )}
        {product.type !== 'DIGITAL' && inStock && currentStock <= 10 && (
          <span className="product-info-stock-low">
            Only {currentStock} left!
          </span>
        )}
      </div>

      {/* Short Description */}
      {product.shortDesc && (
        <p className="product-info-description">{product.shortDesc}</p>
      )}

      {/* Variant Selector */}
      {product.variants.length > 0 && (
        <ProductVariantSelector
          variants={product.variants}
          selectedVariant={selectedVariant}
          onVariantChange={setSelectedVariant}
        />
      )}

      {/* Quantity and Add to Cart */}
      <div className="product-info-actions">
        <div className="product-info-quantity">
          <label className="product-info-quantity-label">Quantity:</label>
          <ProductQuantityInput
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={currentStock}
            disabled={!inStock}
          />
        </div>

        <div className="product-info-buttons">
          <button
            type="button"
            className="btn btn-primary btn-lg product-info-add-to-cart"
            onClick={handleAddToCart}
            disabled={!inStock || isAddingToCart || isBuyingNow}
          >
            {isAddingToCart ? (
              <span className="btn-loading">
                <svg className="spinner" viewBox="0 0 24 24" width="20" height="20">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
                </svg>
                Adding...
              </span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add to Cart
              </>
            )}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-lg product-info-buy-now"
            onClick={handleBuyNow}
            disabled={!inStock || isAddingToCart || isBuyingNow}
          >
            {isBuyingNow ? (
              <span className="btn-loading">
                <svg className="spinner" viewBox="0 0 24 24" width="20" height="20">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
                </svg>
                Processing...
              </span>
            ) : (
              'Buy Now'
            )}
          </button>
        </div>
      </div>

      {/* Secondary Actions */}
      <div className="product-info-secondary-actions">
        <button
          type="button"
          className={`product-info-action-btn ${inWishlist ? 'active' : ''}`}
          onClick={handleWishlistToggle}
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            viewBox="0 0 24 24"
            fill={inWishlist ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{inWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
        </button>

        <button
          type="button"
          className="product-info-action-btn"
          onClick={handleShare}
          aria-label="Share product"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeLinecap="round" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeLinecap="round" />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Product Features */}
      <div className="product-info-features">
        {product.type === 'DIGITAL' ? (
          <>
            <div className="product-info-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <div>
                <strong>Instant Download</strong>
                <span>Available after payment</span>
              </div>
            </div>
            <div className="product-info-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <strong>Email Delivery</strong>
                <span>Download link sent to your email</span>
              </div>
            </div>
            <div className="product-info-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>Secure Payment</strong>
                <span>100% secure checkout</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="product-info-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <path d="M16 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
              <div>
                <strong>Free Shipping</strong>
                <span>On orders over $50</span>
              </div>
            </div>
            <div className="product-info-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="23 4 23 10 17 10" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>30-Day Returns</strong>
                <span>Hassle-free returns</span>
              </div>
            </div>
            <div className="product-info-feature">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <strong>Secure Payment</strong>
                <span>100% secure checkout</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tags */}
      {product.tags.length > 0 && (
        <div className="product-info-tags">
          <span className="product-info-tags-label">Tags:</span>
          <div className="product-info-tags-list">
            {product.tags.map((tag) => (
              <a key={tag} href={`/search?tag=${encodeURIComponent(tag)}`} className="product-info-tag">
                {tag}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
