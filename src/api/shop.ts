import type { ApiProduct, ApiProductWithWeight, ApiReview } from "../types/product";
import { apiFetch } from "./client";

export async function fetchProducts(params: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}): Promise<ApiProduct[]> {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.minPrice != null) q.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) q.set("maxPrice", String(params.maxPrice));
  if (params.sort) q.set("sort", params.sort);
  const res = await apiFetch(`/api/products?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to load products");
  const data = (await res.json()) as { products: ApiProduct[] };
  return data.products;
}

export async function fetchBestsellers(limit = 8): Promise<ApiProduct[]> {
  const res = await apiFetch(`/api/products/bestsellers?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load bestsellers");
  const data = (await res.json()) as { products: ApiProduct[] };
  return data.products;
}

export async function fetchProduct(slug: string): Promise<ApiProduct> {
  const res = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error("Not found");
  const data = (await res.json()) as { product: ApiProduct };
  return data.product;
}

export async function fetchFrequentlyBoughtTogether(
  slug: string,
  limit = 6,
): Promise<ApiProductWithWeight[]> {
  const res = await apiFetch(
    `/api/products/${encodeURIComponent(slug)}/frequently-bought-together?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to load recommendations");
  const data = (await res.json()) as { products: ApiProductWithWeight[] };
  return data.products;
}

export async function fetchReviews(slug: string): Promise<ApiReview[]> {
  const res = await apiFetch(
    `/api/products/${encodeURIComponent(slug)}/reviews`,
  );
  if (!res.ok) throw new Error("Failed to load reviews");
  const data = (await res.json()) as { reviews: ApiReview[] };
  return data.reviews;
}

export async function postReview(
  slug: string,
  body: { rating: number; title: string; body: string },
): Promise<void> {
  const res = await apiFetch(
    `/api/products/${encodeURIComponent(slug)}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Review failed");
  }
}

export async function searchProducts(q: string): Promise<ApiProduct[]> {
  if (q.trim().length < 2) return [];
  const res = await apiFetch(
    `/api/search?q=${encodeURIComponent(q.trim())}`,
  );
  if (!res.ok) throw new Error("Search failed");
  const data = (await res.json()) as { products: ApiProduct[] };
  return data.products;
}

export async function fetchCategories(): Promise<string[]> {
  const res = await apiFetch("/api/meta/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  const data = (await res.json()) as { categories: string[] };
  return data.categories;
}

export async function trackSearch(body: {
  sessionId: string;
  term?: string;
  productSlug?: string;
}): Promise<void> {
  await apiFetch("/api/search/track", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchRecentTerms(sessionId: string): Promise<string[]> {
  const res = await apiFetch(
    `/api/search/recent?sessionId=${encodeURIComponent(sessionId)}`,
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { terms: string[] };
  return data.terms;
}

export async function fetchTrending(): Promise<{ term: string; count: number }[]> {
  const res = await apiFetch("/api/search/trending");
  if (!res.ok) return [];
  const data = (await res.json()) as {
    trending: { term: string; count: number }[];
  };
  return data.trending;
}

export async function placeOrder(items: { productId: string; quantity: number }[]) {
  const res = await apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Order failed");
  }
  return (await res.json()) as { orderId: string; totalInr: number };
}
