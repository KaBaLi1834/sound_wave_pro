export type ProductId = 1 | 2 | 3;

export type ProductVisual = "flagship" | "sport" | "lite";

export type Product = {
  id: ProductId;
  name: string;
  price: number;
  description: string;
  features: string[];
  visual: ProductVisual;
};

export const products: Product[] = [
  {
    id: 1,
    name: "SoundWave Pro X1",
    price: 24999,
    description: "Flagship model with industry-leading noise cancellation",
    features: [
      "Active Noise Cancellation",
      "40hr Battery Life",
      "Premium Leather Cushions",
      "Hi-Res Audio Certified",
    ],
    visual: "flagship",
  },
  {
    id: 2,
    name: "SoundWave Pro Sport",
    price: 16999,
    description: "Built for active lifestyles with sweat-proof tech",
    features: [
      "IPX7 Water Resistant",
      "Secure Fit Design",
      "30hr Battery Life",
      "Built-in Microphone",
    ],
    visual: "sport",
  },
  {
    id: 3,
    name: "SoundWave Pro Lite",
    price: 12499,
    description: "Premium sound in a lightweight package",
    features: [
      "Lightweight Design",
      "25hr Battery Life",
      "Foldable",
      "Quick Charge",
    ],
    visual: "lite",
  },
];
