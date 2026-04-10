import { formatInr } from "../util/money";
import type { CartItem } from "../context/CartContext";

type Props = {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  onChangeQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void | Promise<void>;
};

export function CartModal({
  open,
  onClose,
  items,
  subtotal,
  onChangeQty,
  onRemove,
  onCheckout,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-heading"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close cart"
        >
          ×
        </button>
        <h2 id="cart-heading">Shopping cart</h2>
        <div className="cart-lines">
          {items.length === 0 ? (
            <div className="cart-empty">Your cart is empty.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="cart-row">
                <div>
                  <div className="cart-title">{item.name}</div>
                  <div className="cart-meta">{formatInr(item.priceInr)} each</div>
                  <div className="qty">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => onChangeQty(item.id, -1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => onChangeQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => onRemove(item.id)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
        <div className="cart-total">
          <span>Total</span>
          <span>{formatInr(subtotal)}</span>
        </div>
        <button
          type="button"
          className="checkout-btn"
          disabled={items.length === 0}
          onClick={() => void onCheckout()}
        >
          Proceed to checkout
        </button>
      </div>
    </div>
  );
}
