import { useCallback, useState } from "react";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ProductSection } from "./components/ProductSection";
import { AuthModal } from "./components/AuthModal";
import { CartModal } from "./components/CartModal";
import { Footer } from "./components/Footer";
import { formatInr } from "./util/money";
import type { ProductId } from "./data/products";

function AppShell() {
  const { user, logout } = useAuth();
  const {
    addToCart,
    items,
    subtotal,
    updateQuantity,
    removeFromCart,
    checkout,
    clearCart,
  } = useCart();

  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authGateMessage, setAuthGateMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const scrollToProducts = useCallback(() => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const openAuth = useCallback(() => {
    setAuthGateMessage(null);
    setAuthOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearCart();
    logout();
  }, [clearCart, logout]);

  const handleOpenCart = useCallback(() => {
    if (!user) {
      setAuthGateMessage("Please log in to view your cart.");
      setAuthOpen(true);
      return;
    }
    setCartOpen(true);
  }, [user]);

  const handleAdd = useCallback(
    (id: ProductId) => {
      if (!user) {
        setAuthGateMessage("Please log in to add items to your cart.");
        setAuthOpen(true);
        return;
      }
      addToCart(id);
      showToast("Added to cart.");
    },
    [user, addToCart, showToast],
  );

  const handleCheckout = useCallback(() => {
    if (items.length === 0) {
      showToast("Your cart is empty.");
      return;
    }
    const total = checkout();
    setCartOpen(false);
    showToast(
      `Order placed. Total ${formatInr(total)}. You will receive shipping details shortly.`,
    );
  }, [items.length, checkout, showToast]);

  return (
    <div className="app">
      <Header
        onOpenAuth={openAuth}
        onOpenCart={handleOpenCart}
        onLogout={handleLogout}
      />
      <Hero onBrowse={scrollToProducts} />
      <ProductSection onAdd={handleAdd} />
      <Footer />

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          setAuthGateMessage(null);
        }}
        initialError={authGateMessage}
        onClearInitialError={() => setAuthGateMessage(null)}
      />

      <CartModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={items}
        subtotal={subtotal}
        onChangeQty={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
      />

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
