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
            {items.map((item) => (
              <div key={item.id} className="wishlist-item">
                <div className="wishlist-item-image">
                  <img
                    src={item.product.images[0]?.url || '/images/placeholder.jpg'}
                    alt={item.product.name}
                  />
                </div>
                <div className="wishlist-item-info">
                  <Link to={`/products/${item.product.slug}`} className="item-name">
                    {item.product.name}
                  </Link>
                  <div className="item-price">
                    {(() => {
                      const displayPrice = item.product.salePrice
                        ?? item.product.basePrice
                        ?? item.product.price
                        ?? 0;
                      const basePrice = item.product.basePrice
                        ?? item.product.price
                        ?? displayPrice;
                      const hasSale = item.product.salePrice !== undefined
                        && item.product.salePrice < basePrice;

                      return (
                        <>
                          ₦{displayPrice.toLocaleString()}
                          {hasSale && (
                            <span className="compare-price">
                              ₦{basePrice.toLocaleString()}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="wishlist-item-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddToCart(item.productId)}
                      disabled={item.product.stock === 0}
                    >
                      {item.product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button
                      className="btn btn-text text-danger"
                      onClick={() => handleRemove(item.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
