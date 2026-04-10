import { useCallback, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthModal } from "./components/AuthModal";
import { CartModal } from "./components/CartModal";
import { MainLayout } from "./layouts/MainLayout";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { ShopPage } from "./pages/ShopPage";
import { formatInr } from "./util/money";

function AppShell() {
  const { user } = useAuth();
  const { items, subtotal, updateQuantity, removeFromCart, checkout } =
    useCart();

  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authGateMessage, setAuthGateMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const onAddedToCart = useCallback(() => {
    showToast("Added to cart.");
  }, [showToast]);

  const openAuth = useCallback(() => {
    setAuthGateMessage(null);
    setAuthOpen(true);
  }, []);

  const handleOpenCart = useCallback(() => {
    if (!user) {
      setAuthGateMessage("Please log in to view your cart.");
      setAuthOpen(true);
      return;
    }
    setCartOpen(true);
  }, [user]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) {
      showToast("Your cart is empty.");
      return;
    }
    try {
      const total = await checkout();
      setCartOpen(false);
      showToast(
        `Order placed. Total ${formatInr(total)}. Shipping details will follow.`,
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Checkout failed");
    }
  }, [items.length, checkout, showToast]);

  return (
    <>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          element={
            <MainLayout
              onOpenAuth={openAuth}
              onOpenCart={handleOpenCart}
              onAddedToCart={onAddedToCart}
            />
          }
        >
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="product/:slug" element={<ProductPage />} />
        </Route>
      </Routes>

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
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
