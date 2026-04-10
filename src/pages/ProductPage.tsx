import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  fetchFrequentlyBoughtTogether,
  fetchProduct,
  fetchReviews,
  postReview,
  trackSearch,
} from "../api/shop";
import { ProductCard } from "../components/ProductCard";
import { ProductVisualArt } from "../components/ProductVisual";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import type { MainLayoutContext } from "../layouts/MainLayout";
import { formatInr } from "../util/money";
import { getSessionId } from "../util/session";
import type {
  ApiProduct,
  ApiProductWithWeight,
  ApiReview,
} from "../types/product";

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const { openAuth, onAddedToCart } = useOutletContext<MainLayoutContext>();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [fbt, setFbt] = useState<ApiProductWithWeight[]>([]);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      const [p, rel, rev] = await Promise.all([
        fetchProduct(slug),
        fetchFrequentlyBoughtTogether(slug, 6),
        fetchReviews(slug),
      ]);
      setProduct(p);
      setFbt(rel);
      setReviews(rev);
      setErr(null);
      await trackSearch({ sessionId: getSessionId(), productSlug: slug });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Not found");
      setProduct(null);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!slug || !user) return;
    try {
      await postReview(slug, {
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      });
      setReviewTitle("");
      setReviewBody("");
      setReviewMsg("Review posted.");
      const rev = await fetchReviews(slug);
      setReviews(rev);
    } catch (e) {
      setReviewMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  const addMain = () => {
    if (!product) return;
    if (!user) {
      openAuth();
      return;
    }
    addToCart(product);
    onAddedToCart();
  };

  const addRelated = (p: ApiProduct) => {
    if (!user) {
      openAuth();
      return;
    }
    addToCart(p);
    onAddedToCart();
  };

  if (err || !product) {
    return (
      <div className="page-wrap section">
        <p>{err || "Loading…"}</p>
        <Link to="/shop">Back to shop</Link>
      </div>
    );
  }

  return (
    <article className="page-wrap product-detail section">
      <div className="product-hero">
        <div className="product-hero-visual">
          <ProductVisualArt category={product.category} />
        </div>
        <div>
          <p className="meta-line">
            <span className="meta-pill">{product.category}</span>
            <span className="meta-muted">{product.subcategory}</span>
          </p>
          <h1>{product.name}</h1>
          <p className="desc large">{product.description}</p>
          <p className="price large">{formatInr(product.priceInr)}</p>
          <p className="muted small">
            In stock: {product.stock} · Sold: {product.salesCount}
          </p>
          <button type="button" className="btn btn-primary" onClick={addMain}>
            {user ? "Add to cart" : "Log in to purchase"}
          </button>
        </div>
      </div>

      <section className="detail-block">
        <h2>Frequently bought together</h2>
        <p className="subtext">
          Graph recommendations via CO_PURCHASED relationships (weighted hops
          between product nodes).
        </p>
        <div className="grid small-grid">
          {fbt.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addRelated} />
          ))}
        </div>
        {fbt.length === 0 ? (
          <p className="muted">No co-purchase data for this SKU yet.</p>
        ) : null}
      </section>

      <section className="detail-block">
        <h2>Reviews</h2>
        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            {reviewMsg ? <p className="form-msg success">{reviewMsg}</p> : null}
            <label className="filter-field">
              <span>Rating</span>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-field">
              <label htmlFor="rt">Title</label>
              <input
                id="rt"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="rb">Review</label>
              <textarea
                id="rb"
                rows={4}
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Post review
            </button>
          </form>
        ) : (
          <p className="muted">Log in to write a review.</p>
        )}
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r.id} className="review-item">
              <div className="review-head">
                <strong>{r.title}</strong>
                <span className="review-meta">
                  {r.rating}/5 · {r.authorName}
                </span>
              </div>
              <p>{r.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
