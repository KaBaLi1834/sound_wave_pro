import type { ReactNode } from "react";
import type { ProductCategory } from "../types/product";

const styles: Record<
  "flagship" | "sport" | "lite",
  { label: string; node: ReactNode }
> = {
  flagship: {
    label: "Headphones silhouette",
    node: (
      <>
        <ellipse
          cx="32"
          cy="34"
          rx="22"
          ry="18"
          stroke="currentColor"
          strokeWidth="1.25"
          fill="none"
          opacity="0.35"
        />
        <path
          d="M14 32v10a3 3 0 003 3h4M50 32v10a3 3 0 01-3 3h-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle
          cx="32"
          cy="30"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </>
    ),
  },
  sport: {
    label: "Portable speaker silhouette",
    node: (
      <>
        <path
          d="M18 38c0-8 6-14 14-14s14 6 14 14"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M12 40h8l2-6M52 40h-8l-2-6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle
          cx="32"
          cy="28"
          r="5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
      </>
    ),
  },
  lite: {
    label: "Earpods silhouette",
    node: (
      <>
        <rect
          x="14"
          y="26"
          width="36"
          height="20"
          rx="8"
          stroke="currentColor"
          strokeWidth="1.75"
          fill="none"
        />
        <path
          d="M20 34h24M26 30v8M38 30v8"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </>
    ),
  },
};

export function categoryToVisual(cat: ProductCategory): keyof typeof styles {
  const m: Record<ProductCategory, keyof typeof styles> = {
    EARPODS: "lite",
    SPEAKERS: "sport",
    HEADPHONES: "flagship",
    SOUNDBAR: "sport",
    ACCESSORY: "lite",
  };
  return m[cat] || "flagship";
}

export function ProductVisualArt({
  category,
  className,
}: {
  category: ProductCategory;
  className?: string;
}) {
  const key = categoryToVisual(category);
  const { label, node } = styles[key];
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={label}
    >
      {node}
    </svg>
  );
}
