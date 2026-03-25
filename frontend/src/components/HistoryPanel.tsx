import { getDiscoveries } from "../userId";

export function HistoryPanel() {
  const discoveries = getDiscoveries();

  return (
    <div className="panel history-panel">
      <h2>My Discovery History</h2>

      {discoveries.length === 0 ? (
        <p className="empty">No discoveries yet. Upload a receipt to get started!</p>
      ) : (
        <div className="history-list">
          {discoveries.map((d, i) => (
            <div key={i} className="history-row">
              <div className="history-combo">
                {d.toppings.map((t) => (
                  <span key={t} className="chip small">{t}</span>
                ))}
              </div>
              <div className="history-meta">
                {d.isFirst && <span className="badge first">First!</span>}
                <span className={`badge ${d.tasty ? "tasty" : "not-tasty"}`}>
                  {d.tasty ? "👍" : "👎"}
                </span>
                <span className="history-date">
                  {new Date(d.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
