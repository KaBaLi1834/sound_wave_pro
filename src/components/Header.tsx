import { IconCart, IconHeadphones, IconMoon, IconSun } from "../icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";

type Props = {
  onOpenAuth: () => void;
  onOpenCart: () => void;
  onLogout: () => void;
};

export function Header({ onOpenAuth, onOpenCart, onLogout }: Props) {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="#home">
          <span className="brand-mark" aria-hidden>
            <IconHeadphones />
          </span>
          SoundWave
        </a>
        <nav className="nav-actions" aria-label="Primary">
          <a className="nav-link" href="#home">
            Home
          </a>
          <a className="nav-link" href="#products">
            Products
          </a>
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
              <span className="cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>
            ) : null}
          </button>
          {user ? (
            <div className="user-bar">
              <span className="user-name">Hello, {user.name}</span>
              <button type="button" className="btn btn-ghost" onClick={onLogout}>
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
