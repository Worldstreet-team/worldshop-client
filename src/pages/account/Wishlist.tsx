import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '@/store/wishlistStore';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/store/uiStore';
import { EmptyState } from '@/components/common';

export default function WishlistPage() {
  const { wishlist, isLoading, fetchWishlist, removeFromWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart({ productId, quantity: 1 });
      toast.success('Added to cart!');
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId);
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove from wishlist');
    }
  };

  const items = wishlist?.items || [];

  return (
    <div className="wishlist-page">
      <div className="container">
        <div className="page-header">
          <Link to="/account" className="back-link">
            <span className="material-icons">arrow_back</span>
            Back to Account
          </Link>
          <h1>My Wishlist</h1>
        </div>

        {isLoading && !wishlist ? (
          <div className="loading-state" style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading your wishlist...</p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            description="Save items you love to your wishlist to buy them later."
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            actionLabel="Browse Products"
            actionLink="/shop"
          />
        ) : (
          <div className="wishlist-grid">
            {items.map((item) => {
              const displayPrice = item.product.salePrice
                ?? item.product.basePrice
                ?? item.product.price
                ?? 0;
              const basePrice = item.product.basePrice
                ?? item.product.price
                ?? displayPrice;
              const hasSale = item.product.salePrice !== undefined
                && item.product.salePrice < basePrice;
              const discount = hasSale
                ? Math.round(((basePrice - displayPrice) / basePrice) * 100)
                : 0;

              return (
                <div key={item.id} className="wishlist-card">
                  <button
                    className="wishlist-remove-btn"
                    onClick={() => handleRemove(item.productId)}
                    aria-label="Remove from wishlist"
                    title="Remove from wishlist"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  <Link to={`/products/${item.product.slug}`} className="wishlist-card-image">
                    <img
                      src={item.product.images[0]?.url || '/images/placeholder.jpg'}
                      alt={item.product.name}
                      loading="lazy"
                    />
                    {hasSale && discount > 0 && (
                      <span className="product-badge product-badge-sale">-{discount}%</span>
                    )}
                    {item.product.stock === 0 && (
                      <span className="product-badge product-badge-stock">Out of Stock</span>
                    )}
                  </Link>

                  <div className="wishlist-card-content">
                    <Link to={`/products/${item.product.slug}`} className="wishlist-card-title">
                      {item.product.name}
                    </Link>

                    {item.product.category && (
                      <p className="wishlist-card-category">{item.product.category.name}</p>
                    )}

                    <div className="wishlist-card-price">
                      <span className="price-current">₦{displayPrice.toLocaleString()}</span>
                      {hasSale && (
                        <span className="price-original">₦{basePrice.toLocaleString()}</span>
                      )}
                    </div>

                    {item.product.stock > 0 && item.product.stock <= 5 && (
                      <p className="wishlist-card-stock-warning">
                        Only {item.product.stock} left in stock
                      </p>
                    )}

                    <button
                      className="btn btn-primary btn-block wishlist-add-btn"
                      onClick={() => handleAddToCart(item.productId)}
                      disabled={item.product.stock === 0}
                    >
                      {item.product.stock === 0 ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Out of Stock
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
