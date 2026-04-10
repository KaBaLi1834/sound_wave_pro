import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductId } from "../data/products";
import { products } from "../data/products";
import { useAuth } from "./AuthContext";

export type CartItem = Product & { quantity: number };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addToCart: (productId: ProductId) => void;
  removeFromCart: (productId: ProductId) => void;
  updateQuantity: (productId: ProductId, delta: number) => void;
  clearCart: () => void;
  checkout: () => number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function cartKey(email: string) {
  return `cart_${email}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const raw = localStorage.getItem(cartKey(user.email));
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setItems([]);
        return;
      }
      setItems(parsed as CartItem[]);
    } catch {
      setItems([]);
    }
  }, [user]);

  const persist = useCallback(
    (next: CartItem[]) => {
      if (!user) return;
      localStorage.setItem(cartKey(user.email), JSON.stringify(next));
    },
    [user],
  );

  const addToCart = useCallback(
    (productId: ProductId) => {
      const product = products.find((p) => p.id === productId);
      if (!product || !user) return;
      setItems((prev) => {
        const existing = prev.find((i) => i.id === productId);
        let next: CartItem[];
        if (existing) {
          next = prev.map((i) =>
            i.id === productId ? { ...i, quantity: i.quantity + 1 } : i,
          );
        } else {
          next = [...prev, { ...product, quantity: 1 }];
        }
        persist(next);
        return next;
      });
    },
    [user, persist],
  );

  const removeFromCart = useCallback(
    (productId: ProductId) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== productId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateQuantity = useCallback(
    (productId: ProductId, delta: number) => {
      setItems((prev) => {
        const item = prev.find((i) => i.id === productId);
        if (!item) return prev;
        const q = item.quantity + delta;
        let next: CartItem[];
        if (q <= 0) {
          next = prev.filter((i) => i.id !== productId);
        } else {
          next = prev.map((i) =>
            i.id === productId ? { ...i, quantity: q } : i,
          );
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    if (user) localStorage.removeItem(cartKey(user.email));
  }, [user]);

  const checkout = useCallback(() => {
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    clearCart();
    return total;
  }, [items, clearCart]);

  const itemCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout,
      subtotal,
    }),
    [
      items,
      itemCount,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout,
      subtotal,
    ],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
