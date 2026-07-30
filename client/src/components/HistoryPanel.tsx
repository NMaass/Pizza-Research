import { getDiscoveries } from "../userId";

export function HistoryPanel() {
  const discoveries = getDiscoveries();

  return (
    <section className="pizza-list-view" aria-labelledby="history-title">
      <h1 id="history-title" className="pizza-view-title">
        my combos
      </h1>
      {discoveries.length === 0 ? (
        <p className="nr-muted">no combos recorded on this browser yet</p>
      ) : (
        <div className="pizza-history-list">
          {discoveries.map((discovery) => (
            <article key={discovery.comboKey} className="pizza-history-row">
              <div className="pizza-chip-list">
                {discovery.toppings.map((topping) => (
                  <span key={topping} className="pizza-static-chip">
                    {topping}
                  </span>
                ))}
              </div>
              <div className="pizza-history-meta">
                {discovery.isFirst && <span>first</span>}
                <span>{discovery.tasty ? "tasty" : "not tasty"}</span>
                <time dateTime={discovery.timestamp}>
                  {new Date(discovery.timestamp).toLocaleDateString()}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
