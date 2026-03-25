import { getDiscoveries } from "../userId";

export function HistoryPanel() {
  const discoveries = getDiscoveries();

  return (
    <div style={{
      maxWidth: "480px",
      margin: "0 auto",
      padding: "2rem 1.25rem",
    }}>
      {discoveries.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#888" }}>
          no combos discovered yet — go discover
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {discoveries.map((d, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.875rem",
              gap: "0.75rem",
            }}>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", flex: 1 }}>
                {d.toppings.map((t) => (
                  <span key={t} style={{
                    padding: "0.125rem 0.5rem",
                    border: "1px solid #eee",
                    borderRadius: "1px",
                    fontSize: "0.8125rem",
                  }}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#888", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                {d.isFirst && <span style={{ color: "#111" }}>first</span>}
                <span>{d.tasty ? "tasty" : "not tasty"}</span>
                <span>{new Date(d.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
