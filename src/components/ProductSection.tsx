import { products } from "../data/products";
import type { ProductId } from "../data/products";
import { formatInr } from "../util/money";
import { ProductVisualArt } from "./ProductVisual";

type Props = {
  onAdd: (id: ProductId) => void;
};

export function ProductSection({ onAdd }: Props) {
  return (
    <section className="section" id="products">
      <div className="section-head">
        <h2>Our collection</h2>
        <p>Three profiles. One standard of clarity.</p>
      </div>
      <div className="grid">
        {products.map((p) => (
          <article key={p.id} className="card">
            <div className="card-visual">
              <ProductVisualArt visual={p.visual} />
            </div>
            <div className="card-body">
              <h3>{p.name}</h3>
              <p className="desc">{p.description}</p>
              <ul className="feature-list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <div className="price">{formatInr(p.price)}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onAdd(p.id)}
              >
                Add to cart
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
