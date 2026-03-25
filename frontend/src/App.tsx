import { useState, useEffect } from "react";
import { api, type Stats } from "./api";
import { UploadPanel } from "./components/UploadPanel";
import { ToppingSelector } from "./components/ToppingSelector";
import { ResultPanel } from "./components/ResultPanel";
import { Leaderboard } from "./components/Leaderboard";
import { HistoryPanel } from "./components/HistoryPanel";
import type { DiscoveryResult } from "./api";

type View = "discover" | "leaderboard" | "history";

export function App() {
  const [view, setView] = useState<View>("discover");
  const [stats, setStats] = useState<Stats | null>(null);
  const [allToppings, setAllToppings] = useState<string[]>([]);

  // Discovery flow state
  const [ocrToppings, setOcrToppings] = useState<string[] | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
    api.getToppings().then((d) => setAllToppings(d.toppings)).catch(() => {});
  }, []);

  const resetFlow = () => {
    setOcrToppings(null);
    setSelectedToppings([]);
    setResult(null);
    api.getStats().then(setStats).catch(() => {});
  };

  return (
    <div className="app">
      <header>
        <h1>Pizza Research</h1>
        <p className="subtitle">Discover every pizza topping combo in existence</p>
        {stats && (
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (stats.comboCount / stats.maxCombos) * 100)}%`,
                }}
              />
            </div>
            <span className="progress-text">
              {stats.comboCount.toLocaleString()} / {stats.maxCombos.toLocaleString()} combos
              discovered ({((stats.comboCount / stats.maxCombos) * 100).toFixed(2)}%)
            </span>
          </div>
        )}
        <nav>
          <button className={view === "discover" ? "active" : ""} onClick={() => { setView("discover"); resetFlow(); }}>
            Discover
          </button>
          <button className={view === "leaderboard" ? "active" : ""} onClick={() => setView("leaderboard")}>
            Leaderboards
          </button>
          <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
            My History
          </button>
        </nav>
      </header>

      <main>
        {view === "discover" && !result && !ocrToppings && (
          <UploadPanel
            allToppings={allToppings}
            onOcrResult={setOcrToppings}
            onManualSelect={() => setOcrToppings([])}
          />
        )}

        {view === "discover" && !result && ocrToppings !== null && (
          <ToppingSelector
            allToppings={allToppings}
            suggestedToppings={ocrToppings}
            selected={selectedToppings}
            onSelectionChange={setSelectedToppings}
            onSubmit={setResult}
            onBack={() => setOcrToppings(null)}
          />
        )}

        {view === "discover" && result && (
          <ResultPanel result={result} onReset={resetFlow} />
        )}

        {view === "leaderboard" && <Leaderboard />}
        {view === "history" && <HistoryPanel />}
      </main>
    </div>
  );
}
