import { Link } from "react-router-dom";

export function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-inner">
        <p className="hero-kicker">Wireless audio</p>
        <h1>Premium Wireless Headphones</h1>
        <p>
          Crystal-clear sound meets comfort, tuned for long listening sessions.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Browse collection
        </Link>
      </div>
    </section>
  );
}
