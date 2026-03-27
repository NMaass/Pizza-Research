import { useState, useEffect } from "react";
import { api, type Stats } from "./api";
import { UploadPanel, type ReceiptOcrResult } from "./components/UploadPanel";
import { ToppingSelector } from "./components/ToppingSelector";
import { ResultPanel } from "./components/ResultPanel";
import { Leaderboard } from "./components/Leaderboard";
import { HistoryPanel } from "./components/HistoryPanel";
import { ProgressBar } from "./components/ProgressBar";
import { PizzaMap } from "./components/PizzaMap";
import type { DiscoveryResult } from "./api";

type View = "discover" | "leaderboard" | "my combos" | "map";

const tabs: View[] = ["discover", "leaderboard", "my combos", "map"];

export function App() {
  const [view, setView] = useState<View>("discover");
  const [stats, setStats] = useState<Stats | null>(null);
  const [allToppings, setAllToppings] = useState<string[]>([]);

  const [ocrToppings, setOcrToppings] = useState<string[] | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  // Restaurant info from OCR
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
    api.getToppings().then((d) => setAllToppings(d.toppings)).catch(() => {});
  }, []);

  const resetFlow = () => {
    setOcrToppings(null);
    setSelectedToppings([]);
    setResult(null);
    setRestaurantName(null);
    setRestaurantAddress(null);
    api.getStats().then(setStats).catch(() => {});
  };

  const handleOcrResult = (ocrResult: ReceiptOcrResult) => {
    setOcrToppings(ocrResult.toppings);
    setRestaurantName(ocrResult.restaurantName);
    setRestaurantAddress(ocrResult.restaurantAddress);
  };

  const handleDiscoveryResult = (discoveryResult: DiscoveryResult) => {
    setResult(discoveryResult);
    // Geocode restaurant if we have an address
    if (restaurantAddress) {
      api.geocode(restaurantAddress, restaurantName ?? undefined).catch(() => {});
    }
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
                onOcrResult={handleOcrResult}
              />
            )}

            {!result && ocrToppings !== null && (
              <ToppingSelector
                allToppings={allToppings}
                suggestedToppings={ocrToppings}
                selected={selectedToppings}
                onSelectionChange={setSelectedToppings}
                onSubmit={handleDiscoveryResult}
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
        {view === "map" && <PizzaMap />}
      </div>
    </div>
  );
}
