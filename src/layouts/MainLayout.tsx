import { Outlet } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

export type MainLayoutContext = {
  openAuth: () => void;
  onAddedToCart: () => void;
};

type Props = {
  onOpenAuth: () => void;
  onOpenCart: () => void;
  onAddedToCart: () => void;
};

export function MainLayout({ onOpenAuth, onOpenCart, onAddedToCart }: Props) {
  const ctx: MainLayoutContext = {
    openAuth: onOpenAuth,
    onAddedToCart,
  };
  return (
    <div className="app">
      <Header onOpenAuth={onOpenAuth} onOpenCart={onOpenCart} />
      <Outlet context={ctx} />
      <Footer />
    </div>
  );
}
