import { Link } from "react-router-dom";
import type { ApiProduct } from "../types/product";
import { formatInr } from "../util/money";
import { ProductVisualArt } from "./ProductVisual";

type Props = {
  product: ApiProduct;
  onAdd: (p: ApiProduct) => void;
};

export function ProductCard({ product, onAdd }: Props) {
  return (
    <article className="card">
      <Link to={`/product/${product.slug}`} className="card-visual card-visual-link">
        <ProductVisualArt category={product.category} />
      </Link>
      <div className="card-body">
        <h3>
          <Link to={`/product/${product.slug}`} className="card-title-link">
            {product.name}
          </Link>
        </h3>
        <p className="desc">{product.description}</p>
        <p className="meta-line">
          <span className="meta-pill">{product.category}</span>
          <span className="meta-muted">{product.subcategory}</span>
        </p>
        <div className="price">{formatInr(product.priceInr)}</div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAdd(product)}
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
