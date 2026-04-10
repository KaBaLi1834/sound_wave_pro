import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IconCart, IconHeadphones, IconMoon, IconSun } from "../icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import { trackSearch } from "../api/shop";
import { getSessionId } from "../util/session";

type Props = {
  onOpenAuth: () => void;
  onOpenCart: () => void;
};

export function Header({ onOpenAuth, onOpenCart }: Props) {
  const { user, logout } = useAuth();
  const { itemCount, clearCart } = useCart();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function handleLogout() {
    clearCart();
    logout();
  }

  function submitSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    void trackSearch({ sessionId: getSessionId(), term: term.toLowerCase() });
    navigate(`/shop?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden>
            <IconHeadphones />
          </span>
          SoundWave
        </Link>
        <form className="header-search" onSubmit={submitSearch}>
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            type="search"
            placeholder="Search catalog…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </form>
        <nav className="nav-actions" aria-label="Primary">
          <Link className="nav-link" to="/">
            Home
          </Link>
          <Link className="nav-link" to="/shop">
            Shop
          </Link>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenCart}
            aria-label="Shopping cart"
          >
            <IconCart />
            {itemCount > 0 ? (
              <span className="cart-badge">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </button>
          {user ? (
            <div className="user-bar">
              <span className="user-name">Hello, {user.name}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onOpenAuth}>
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
