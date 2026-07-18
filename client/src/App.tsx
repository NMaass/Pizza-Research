import { useCallback, useEffect, useState } from "react";
import {
  Button,
  ResearchHeader,
  ResearchShell,
  StatusMessage,
  Tabs,
} from "@nmaass/research-ui";
import { api, type DiscoveryResult, type Stats } from "./api";
import { HistoryPanel } from "./components/HistoryPanel";
import { Leaderboard } from "./components/Leaderboard";
import { PizzaMap } from "./components/PizzaMap";
import { ProgressBar } from "./components/ProgressBar";
import { ResultPanel } from "./components/ResultPanel";
import { ToppingSelector } from "./components/ToppingSelector";
import { UploadPanel, type ReceiptOcrResult } from "./components/UploadPanel";

type View = "discover" | "leaderboard" | "my combos" | "map";

const tabs: Array<{ id: View; label: string }> = [
  { id: "discover", label: "discover" },
  { id: "leaderboard", label: "leaderboard" },
  { id: "my combos", label: "my combos" },
  { id: "map", label: "map" },
];

const viewFromHash = (): View => {
  const requested = decodeURIComponent(window.location.hash.slice(1));
  return tabs.some(({ id }) => id === requested) ? (requested as View) : "discover";
};

export function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allToppings, setAllToppings] = useState<string[]>([]);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [ocrToppings, setOcrToppings] = useState<string[] | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");

  const loadReferenceData = useCallback(async () => {
    setStartupError(null);
    try {
      const [nextStats, toppingData] = await Promise.all([
        api.getStats(),
        api.getToppings(),
      ]);
      setStats(nextStats);
      setAllToppings(toppingData.toppings);
    } catch (error) {
      setStartupError(
        error instanceof Error ? error.message : "could not load pizza research data",
      );
    }
  }, []);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    const handleHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const resetFlow = () => {
    setOcrToppings(null);
    setSelectedToppings([]);
    setResult(null);
    setRestaurantName("");
    setRestaurantAddress("");
    void loadReferenceData();
  };

  const selectView = (nextView: View) => {
    window.location.hash = encodeURIComponent(nextView);
    setView(nextView);
    if (nextView === "discover") resetFlow();
  };

  const handleOcrResult = (ocrResult: ReceiptOcrResult) => {
    setOcrToppings(ocrResult.toppings);
    setSelectedToppings(ocrResult.toppings.slice(0, 4));
    setRestaurantName(ocrResult.restaurantName ?? "");
    setRestaurantAddress(ocrResult.restaurantAddress ?? "");
  };

  const handleDiscoveryResult = (discoveryResult: DiscoveryResult) => {
    setResult(discoveryResult);
    if (restaurantAddress.trim()) {
      api.geocode(restaurantAddress.trim(), restaurantName.trim() || undefined).catch(() => {
        // Geocoding is supplementary; the discovery itself has already succeeded.
      });
    }
  };

  return (
    <ResearchShell className="pizza-research">
      <ResearchHeader title="Pizza Research Inc." homeHref="#discover">
        <Tabs items={tabs} activeId={view} onChange={(id) => selectView(id as View)} />
      </ResearchHeader>

      <main className="nr-page">
        {startupError && (
          <StatusMessage
            variant="error"
            title="could not load research data"
            action={<Button onClick={() => void loadReferenceData()}>try again</Button>}
          >
            {startupError}
          </StatusMessage>
        )}

        {view === "discover" && (
          <section className="nr-panel nr-panel--center pizza-view" aria-label="discover a pizza combination">
            {stats && (
              <>
                <ProgressBar fraction={stats.comboCount / stats.maxCombos} />
                <p className="nr-muted pizza-progress-copy">
                  {((stats.comboCount / stats.maxCombos) * 100).toFixed(3)}% of combos discovered
                  ({" "}{stats.comboCount.toLocaleString()} / {stats.maxCombos.toLocaleString()})
                </p>
              </>
            )}

            {!result && ocrToppings === null && <UploadPanel onOcrResult={handleOcrResult} />}

            {!result && ocrToppings !== null && (
              <>
                <div className="nr-field">
                  <label className="nr-label" htmlFor="restaurant-name">restaurant name</label>
                  <input
                    id="restaurant-name"
                    className="nr-input"
                    value={restaurantName}
                    onChange={(event) => setRestaurantName(event.target.value)}
                    placeholder="optional"
                  />
                </div>
                <div className="nr-field">
                  <label className="nr-label" htmlFor="restaurant-address">restaurant address</label>
                  <input
                    id="restaurant-address"
                    className="nr-input"
                    value={restaurantAddress}
                    onChange={(event) => setRestaurantAddress(event.target.value)}
                    placeholder="optional"
                  />
                </div>
                <ToppingSelector
                  allToppings={allToppings}
                  suggestedToppings={ocrToppings}
                  selected={selectedToppings}
                  onSelectionChange={setSelectedToppings}
                  onSubmit={handleDiscoveryResult}
                  onBack={() => setOcrToppings(null)}
                />
              </>
            )}

            {result && <ResultPanel result={result} onReset={resetFlow} />}
          </section>
        )}

        {view === "leaderboard" && <Leaderboard />}
        {view === "my combos" && <HistoryPanel />}
        {view === "map" && <PizzaMap />}
      </main>
    </ResearchShell>
  );
}
