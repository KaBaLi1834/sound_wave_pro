type Props = {
  onBrowse: () => void;
};

export function Hero({ onBrowse }: Props) {
  return (
    <section className="hero" id="home">
      <div className="hero-inner">
        <p className="hero-kicker">Wireless audio</p>
        <h1>Premium Wireless Headphones</h1>
        <p>Crystal-clear sound meets comfort, tuned for long listening sessions.</p>
        <button type="button" className="btn btn-primary" onClick={onBrowse}>
          Browse collection
        </button>
      </div>
    </section>
  );
}
