import { Link } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';

export default function CartSidebar() {
  const { isCartSidebarOpen, closeCartSidebar } = useUIStore();
  const { cart, removeItem, updateQuantity, isUpdating } = useCartStore();

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(itemId, newQuantity);
    } catch {
      // Error handled by store
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch {
      // Error handled by store
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${isCartSidebarOpen ? 'active' : ''}`}
        onClick={closeCartSidebar}
      />

      {/* Sidebar */}
      <div className={`cart-sidebar ${isCartSidebarOpen ? 'open' : ''}`}>
        <div className="cart-sidebar-header">
          <h3>Shopping Cart</h3>
          <button
            className="close-btn"
            onClick={closeCartSidebar}
            aria-label="Close cart"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="cart-sidebar-content">
          {!cart || cart.items.length === 0 ? (
            <div className="cart-empty">
              <span className="material-icons">shopping_cart</span>
              <p>Your cart is empty</p>
              <Link
                to="/products"
                className="btn btn-primary"
                onClick={closeCartSidebar}
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <ul className="cart-items">
              {cart.items.map((item) => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item-image">
                    <img
                      src={item.product.images[0]?.url || '/images/placeholder.jpg'}
                      alt={item.product.name}
                    />
                  </div>
                  <div className="cart-item-details">
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="cart-item-name"
                      onClick={closeCartSidebar}
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <span className="cart-item-variant">{item.variant.name}</span>
                    )}
                    <div className="cart-item-price">
                      ₦{item.price.toLocaleString()}
                    </div>
                    <div className="cart-item-quantity">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={isUpdating || item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        disabled={isUpdating}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() => handleRemove(item.id)}
                    disabled={isUpdating}
                    aria-label="Remove item"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="cart-sidebar-footer">
            <div className="cart-subtotal">
              <span>Subtotal:</span>
              <span className="subtotal-amount">₦{cart.subtotal.toLocaleString()}</span>
            </div>
            <div className="cart-actions">
              <Link
                to="/cart"
                className="btn btn-secondary"
                onClick={closeCartSidebar}
              >
                View Cart
              </Link>
              <Link
                to="/checkout"
                className="btn btn-primary"
                onClick={closeCartSidebar}
              >
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
