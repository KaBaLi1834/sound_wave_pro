export type ProductCategory =
  | "EARPODS"
  | "SPEAKERS"
  | "HEADPHONES"
  | "SOUNDBAR"
  | "ACCESSORY";

export type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceInr: number;
  category: ProductCategory;
  subcategory: string;
  stock: number;
  salesCount: number;
};

export type ApiProductWithWeight = ApiProduct & { weight?: number };

export type ApiReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};
