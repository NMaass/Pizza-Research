import { useCallback, useEffect, useState } from "react";
import {
  api,
  type DiscovererLeaderboardEntry,
  type LeaderboardEntry,
} from "../api";
import { Button, ResearchNav, StatusMessage } from "../research-ui";

type Tab = "common" | "tasty" | "discoverers";

const tabItems: Array<{ id: Tab; label: string }> = [
  { id: "common", label: "most common" },
  { id: "tasty", label: "highest rated" },
  { id: "discoverers", label: "top discoverers" },
];

export function Leaderboard() {
  const [tab, setTab] = useState<Tab>("common");
  const [combos, setCombos] = useState<LeaderboardEntry[]>([]);
  const [discoverers, setDiscoverers] = useState<DiscovererLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (activeTab: Tab, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "discoverers") {
        const result = await api.getDiscovererLeaderboard();
        if (signal?.aborted) return;
        setDiscoverers(result.leaderboard);
        setCombos([]);
      } else {
        const result = await api.getLeaderboard(activeTab);
        if (signal?.aborted) return;
        setCombos(result.leaderboard);
        setDiscoverers([]);
      }
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "could not load leaderboard");
      setCombos([]);
      setDiscoverers([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(tab, controller.signal);
    return () => controller.abort();
  }, [load, tab]);

  const hasData = tab === "discoverers" ? discoverers.length > 0 : combos.length > 0;

  return (
    <section className="pizza-list-view" aria-labelledby="leaderboard-title">
      <h1 id="leaderboard-title" className="pizza-view-title">
        leaderboard
      </h1>
      <ResearchNav
        items={tabItems}
        activeId={tab}
        onChange={(id) => setTab(id as Tab)}
        ariaLabel="leaderboard categories"
      />

      {loading ? (
        <StatusMessage variant="info" title="loading leaderboard" />
      ) : error ? (
        <StatusMessage
          variant="error"
          title="could not load leaderboard"
          action={<Button onClick={() => void load(tab)}>try again</Button>}
        >
          {error}
        </StatusMessage>
      ) : !hasData ? (
        <p className="nr-muted">no qualifying discoveries yet</p>
      ) : tab === "discoverers" ? (
        <ol className="pizza-leaderboard-list">
          {discoverers.map((entry) => (
            <li key={entry.userId} className="pizza-leaderboard-row">
              <span className="pizza-leaderboard-name" title={entry.userId}>
                {entry.userId.slice(0, 8)}...
              </span>
              <span className="nr-muted">
                {entry.count} first {entry.count === 1 ? "discovery" : "discoveries"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="pizza-leaderboard-list">
          {combos.map((entry) => (
            <li key={entry.key} className="pizza-leaderboard-row">
              <span className="pizza-leaderboard-name">{entry.key.split("|").join(" + ")}</span>
              <span className="nr-muted">
                {tab === "tasty"
                  ? `${Math.round((entry.tastiness ?? 0) * 100)}% (${entry.data.count})`
                  : `${entry.data.count} ${entry.data.count === 1 ? "observer" : "observers"}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
