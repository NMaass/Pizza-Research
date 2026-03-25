import { useState, useEffect } from "react";
import { api, type LeaderboardEntry } from "../api";

type Tab = "common" | "tasty" | "discoverers";

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
    <div className="panel leaderboard-panel">
      <h2>Leaderboards</h2>

      <div className="tab-bar">
        <button className={tab === "common" ? "active" : ""} onClick={() => setTab("common")}>
          Most Common
        </button>
        <button className={tab === "tasty" ? "active" : ""} onClick={() => setTab("tasty")}>
          Highest Rated
        </button>
        <button className={tab === "discoverers" ? "active" : ""} onClick={() => setTab("discoverers")}>
          Top Discoverers
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : data.length === 0 ? (
        <p className="empty">No data yet. Be the first to discover a combo!</p>
      ) : (
        <div className="leaderboard-list">
          {tab === "discoverers"
            ? (data as Array<{ userId: string; count: number }>).map((entry, i) => (
                <div key={entry.userId} className="lb-row">
                  <span className="rank">#{i + 1}</span>
                  <span className="lb-name">{entry.userId.slice(0, 8)}...</span>
                  <span className="lb-value">{entry.count} discoveries</span>
                </div>
              ))
            : (data as Array<LeaderboardEntry & { tastiness?: number }>).map((entry, i) => (
                <div key={entry.key} className="lb-row">
                  <span className="rank">#{i + 1}</span>
                  <span className="lb-name">
                    {entry.key.split("|").join(" + ")}
                  </span>
                  <span className="lb-value">
                    {tab === "tasty"
                      ? `${Math.round((entry.tastiness ?? 0) * 100)}% tasty`
                      : `${entry.data.count} discoveries`}
                  </span>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
