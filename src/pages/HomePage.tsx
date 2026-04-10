import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  fetchBestsellers,
  fetchRecentTerms,
  fetchTrending,
} from "../api/shop";
import { Hero } from "../components/Hero";
import { ProductCard } from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import type { MainLayoutContext } from "../layouts/MainLayout";
import type { ApiProduct } from "../types/product";
import { getSessionId } from "../util/session";

export function HomePage() {
  const { openAuth, onAddedToCart } = useOutletContext<MainLayoutContext>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [best, setBest] = useState<ApiProduct[]>([]);
  const [trending, setTrending] = useState<{ term: string; count: number }[]>(
    [],
  );
  const [recent, setRecent] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, tr, rc] = await Promise.all([
        fetchBestsellers(8),
        fetchTrending(),
        fetchRecentTerms(getSessionId()),
      ]);
      setBest(b);
      setTrending(tr);
      setRecent(rc);
      setErr(null);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Could not reach the API. Run Neo4j and the API server, or set VITE_API_URL.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    <>
      <Hero />
      {err ? (
        <div className="banner-error page-wrap">
          <p>{err}</p>
        </div>
      ) : null}

      <section className="section page-wrap">
        <div className="section-head">
          <h2>Bestselling right now</h2>
          <p>Ranked by live sales counts stored in Neo4j.</p>
        </div>
        <div className="grid">
          {best.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={handleAdd} />
          ))}
        </div>
        <div className="section-cta">
          <Link to="/shop" className="btn btn-primary">
            View full catalog
          </Link>
        </div>
      </section>

      <section className="section page-wrap section-alt">
        <div className="two-col">
          <div>
            <h3 className="subhead">Trending searches</h3>
            <p className="subtext">
              Aggregated from SearchStat nodes (global activity).
            </p>
            <ul className="chip-list">
              {trending.map((t) => (
                <li key={t.term}>
                  <Link to={`/shop?q=${encodeURIComponent(t.term)}`}>
                    {t.term}
                  </Link>
                  <span className="chip-count">{t.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="subhead">Your recent searches</h3>
            <p className="subtext">
              Stored per session in SearchEvent nodes.
            </p>
            {recent.length === 0 ? (
              <p className="muted">Search from the header to build history.</p>
            ) : (
              <ul className="chip-list">
                {recent.map((t) => (
                  <li key={t}>
                    <Link to={`/shop?q=${encodeURIComponent(t)}`}>{t}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
