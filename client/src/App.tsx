import { useState, useEffect } from "react";
import { api, type Stats } from "./api";
import { UploadPanel } from "./components/UploadPanel";
import { ToppingSelector } from "./components/ToppingSelector";
import { ResultPanel } from "./components/ResultPanel";
import { Leaderboard } from "./components/Leaderboard";
import { HistoryPanel } from "./components/HistoryPanel";
import { ProgressBar } from "./components/ProgressBar";
import type { DiscoveryResult } from "./api";

type View = "discover" | "leaderboard" | "my combos";

const tabs: View[] = ["discover", "leaderboard", "my combos"];

export function App() {
  const [view, setView] = useState<View>("discover");
  const [stats, setStats] = useState<Stats | null>(null);
  const [allToppings, setAllToppings] = useState<string[]>([]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <nav style={{
        display: "flex",
        gap: "1.5rem",
        padding: "0.75rem 1.25rem",
        fontSize: "0.875rem",
        borderBottom: "1px solid #eee",
      }}>
        {tabs.map((tab) => (
          <span
            key={tab}
            onClick={() => { setView(tab); if (tab === "discover") resetFlow(); }}
            style={{
              cursor: "pointer",
              textDecoration: view === tab ? "underline" : "none",
            }}
          >
            {tab}
          </span>
        ))}
      </nav>

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}>
        {view === "discover" && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "2rem 1.25rem",
            gap: "1rem",
          }}>
            {stats && (
              <>
                <ProgressBar fraction={stats.comboCount / stats.maxCombos} />
                <p style={{ fontSize: "0.875rem", color: "#666" }}>
                  {((stats.comboCount / stats.maxCombos) * 100).toFixed(3)}% of combos
                  discovered ({stats.comboCount.toLocaleString()} / {stats.maxCombos.toLocaleString()})
                </p>
              </>
            )}

            {!result && ocrToppings === null && (
              <UploadPanel
                allToppings={allToppings}
                onOcrResult={setOcrToppings}
                onManualSelect={() => setOcrToppings([])}
              />
            )}

            {!result && ocrToppings !== null && (
              <ToppingSelector
                allToppings={allToppings}
                suggestedToppings={ocrToppings}
                selected={selectedToppings}
                onSelectionChange={setSelectedToppings}
                onSubmit={setResult}
                onBack={() => setOcrToppings(null)}
              />
            )}

            {result && (
              <ResultPanel result={result} onReset={resetFlow} />
            )}
          </div>
        )}

        {view === "leaderboard" && <Leaderboard />}
        {view === "my combos" && <HistoryPanel />}
      </div>
    </div>
  );
}
