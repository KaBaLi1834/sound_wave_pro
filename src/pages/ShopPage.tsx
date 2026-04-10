import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { fetchCategories, fetchProducts, searchProducts, trackSearch } from "../api/shop";
import { ProductCard } from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import type { MainLayoutContext } from "../layouts/MainLayout";
import type { ApiProduct } from "../types/product";
import { getSessionId } from "../util/session";

export function ShopPage() {
  const { openAuth, onAddedToCart } = useOutletContext<MainLayoutContext>();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "bestseller";

  const load = useCallback(async () => {
    try {
      if (q.trim().length >= 2) {
        const list = await searchProducts(q);
        setProducts(list);
        await trackSearch({
          sessionId: getSessionId(),
          term: q.trim().toLowerCase(),
        });
      } else {
        const list = await fetchProducts({
          category: category || undefined,
          sort,
        });
        setProducts(list);
      }
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }, [q, category, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const handleAdd = useCallback(
    (p: ApiProduct) => {
      if (!user) {
        openAuth();
        return;
      }
      addToCart(p);
      onAddedToCart();
    },
    [user, addToCart, openAuth, onAddedToCart],
  );

  return (
    <section className="section page-wrap shop-page">
      <div className="section-head">
        <h1>Shop</h1>
        <p>
          Forty products across earpods, speakers, headphones, soundbars, and
          accessories.
        </p>
      </div>

      <div className="filters">
        <label className="filter-field">
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set("category", e.target.value);
              else next.delete("category");
              setParams(next);
            }}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set("sort", e.target.value);
              setParams(next);
            }}
          >
            <option value="bestseller">Bestselling</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {err ? <div className="banner-error">{err}</div> : null}

      <div className="grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
      </div>
      {products.length === 0 && !err ? (
        <p className="muted center">No products match your filters.</p>
      ) : null}
    </section>
  );
}
