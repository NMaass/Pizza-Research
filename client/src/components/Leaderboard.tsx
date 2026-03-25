import { useState, useEffect } from "react";
import { api, type LeaderboardEntry } from "../api";

type Tab = "common" | "tasty" | "discoverers";

const tabLabels: { key: Tab; label: string }[] = [
  { key: "common", label: "most common" },
  { key: "tasty", label: "highest rated" },
  { key: "discoverers", label: "top discoverers" },
];

export function Leaderboard() {
  const [tab, setTab] = useState<Tab>("common");
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getLeaderboard(tab)
      .then((r) => setData(r.leaderboard))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div style={{
      maxWidth: "480px",
      margin: "0 auto",
      padding: "2rem 1.25rem",
    }}>
      <div style={{
        display: "flex",
        gap: "1.5rem",
        fontSize: "0.875rem",
        marginBottom: "1.5rem",
      }}>
        {tabLabels.map(({ key, label }) => (
          <span
            key={key}
            onClick={() => setTab(key)}
            style={{
              cursor: "pointer",
              textDecoration: tab === key ? "underline" : "none",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: "0.875rem", color: "#888" }}>loading...</p>
      ) : data.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#888" }}>no discoveries yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {tab === "discoverers"
            ? (data as Array<{ userId: string; count: number }>).map((entry, i) => (
                <div key={entry.userId} style={{
                  display: "flex",
                  gap: "0.75rem",
                  fontSize: "0.875rem",
                  alignItems: "baseline",
                }}>
                  <span style={{ color: "#888", minWidth: "1.5rem" }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{entry.userId.slice(0, 8)}...</span>
                  <span style={{ color: "#888" }}>{entry.count}</span>
                </div>
              ))
            : (data as Array<LeaderboardEntry & { tastiness?: number }>).map((entry, i) => (
                <div key={entry.key} style={{
                  display: "flex",
                  gap: "0.75rem",
                  fontSize: "0.875rem",
                  alignItems: "baseline",
                }}>
                  <span style={{ color: "#888", minWidth: "1.5rem" }}>{i + 1}</span>
                  <span style={{ flex: 1 }}>{entry.key.split("|").join(" + ")}</span>
                  <span style={{ color: "#888" }}>
                    {tab === "tasty"
                      ? `${Math.round((entry.tastiness ?? 0) * 100)}%`
                      : entry.data.count}
                  </span>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
