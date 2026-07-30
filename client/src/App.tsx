import { useCallback, useEffect, useState } from "react";
import { api, type DiscoveryResult, type Stats } from "./api";
import { HistoryPanel } from "./components/HistoryPanel";
import { Leaderboard } from "./components/Leaderboard";
import { PizzaMap } from "./components/PizzaMap";
import { ProgressBar } from "./components/ProgressBar";
import { ResultPanel } from "./components/ResultPanel";
import { ToppingSelector } from "./components/ToppingSelector";
import { UploadPanel, type ReceiptOcrResult } from "./components/UploadPanel";
import {
  Button,
  ResearchHeader,
  ResearchNav,
  ResearchShell,
  StatusMessage,
} from "./research-ui";
import { getUserId } from "./userId";

type View = "discover" | "leaderboard" | "my combos" | "map";

const tabs: Array<{ id: View; label: string }> = [
  { id: "discover", label: "discover" },
  { id: "leaderboard", label: "leaderboard" },
  { id: "my combos", label: "my combos" },
  { id: "map", label: "map" },
];

function viewFromHash(): View {
  let requested = "";
  try {
    requested = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "discover";
  }
  return tabs.some(({ id }) => id === requested) ? (requested as View) : "discover";
}

export function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [stats, setStats] = useState<Stats | null>(null);
  const [allToppings, setAllToppings] = useState<string[]>([]);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [ocrToppings, setOcrToppings] = useState<string[] | null>(null);
  const [unresolvedToppings, setUnresolvedToppings] = useState<string[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantAddress, setRestaurantAddress] = useState("");
  const [locationWarning, setLocationWarning] = useState<string | null>(null);

  const loadReferenceData = useCallback(async () => {
    setStartupError(null);
    const [statsResult, toppingsResult] = await Promise.allSettled([
      api.getStats(),
      api.getToppings(),
    ]);

    const errors: string[] = [];
    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      errors.push(statsResult.reason instanceof Error ? statsResult.reason.message : "could not load statistics");
    }

    if (toppingsResult.status === "fulfilled") {
      setAllToppings(toppingsResult.value.toppings);
    } else {
      errors.push(
        toppingsResult.reason instanceof Error
          ? toppingsResult.reason.message
          : "could not load the topping list",
      );
    }

    setStartupError(errors.length > 0 ? errors.join("; ") : null);
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
    setUnresolvedToppings([]);
    setSelectedToppings([]);
    setResult(null);
    setRestaurantName("");
    setRestaurantAddress("");
    setLocationWarning(null);
    void loadReferenceData();
  };

  const selectView = (nextView: View) => {
    const nextHash = `#${encodeURIComponent(nextView)}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setView(nextView);
    }
    if (nextView === "discover") resetFlow();
  };

  const handleOcrResult = (ocrResult: ReceiptOcrResult) => {
    setOcrToppings(ocrResult.toppings);
    setUnresolvedToppings(ocrResult.unresolvedToppings);
    setSelectedToppings(ocrResult.toppings.slice(0, 4));
    setAllToppings((current) =>
      [...new Set([...current, ...ocrResult.toppings])].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
    setRestaurantName(ocrResult.restaurantName ?? "");
    setRestaurantAddress(ocrResult.restaurantAddress ?? "");
  };

  const handleDiscoveryResult = (discoveryResult: DiscoveryResult) => {
    setResult(discoveryResult);
    setLocationWarning(null);

    const address = restaurantAddress.trim();
    if (address && discoveryResult.isNewObservation) {
      void api
        .geocode(
          address,
          restaurantName.trim() || undefined,
          discoveryResult.comboKey,
          getUserId(),
        )
        .catch((error: unknown) => {
          setLocationWarning(
            error instanceof Error
              ? `the combo was recorded, but the restaurant could not be added to the map: ${error.message}`
              : "the combo was recorded, but the restaurant could not be added to the map",
          );
        });
    }
  };

  const maxCombos = stats?.maxCombos ?? 0;
  const discoveredFraction = maxCombos > 0 && stats ? stats.comboCount / maxCombos : 0;

  return (
    <ResearchShell className="pizza-research">
      <ResearchHeader title="Pizza Research Inc." homeHref="#discover">
        <ResearchNav
          items={tabs}
          activeId={view}
          onChange={(id) => selectView(id as View)}
          ariaLabel="pizza research views"
        />
      </ResearchHeader>

      <main className="nr-page">
        {startupError && (
          <StatusMessage
            variant="error"
            title="some research data could not be loaded"
            action={<Button onClick={() => void loadReferenceData()}>try again</Button>}
          >
            {startupError}
          </StatusMessage>
        )}

        {view === "discover" && (
          <section className="nr-panel nr-panel--center pizza-view" aria-label="discover a pizza combination">
            {stats && maxCombos > 0 && (
              <>
                <ProgressBar fraction={discoveredFraction} />
                <p className="nr-muted pizza-progress-copy">
                  {(discoveredFraction * 100).toFixed(3)}% of combos discovered ({" "}
                  {stats.comboCount.toLocaleString()} / {maxCombos.toLocaleString()})
                </p>
              </>
            )}

            {!result && ocrToppings === null && <UploadPanel onOcrResult={handleOcrResult} />}

            {!result && ocrToppings !== null && (
              <>
                <div className="nr-field">
                  <label className="nr-label" htmlFor="restaurant-name">
                    restaurant name
                  </label>
                  <input
                    id="restaurant-name"
                    className="nr-input"
                    value={restaurantName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRestaurantName(event.target.value)}
                    maxLength={120}
                    placeholder="optional"
                  />
                </div>
                <div className="nr-field">
                  <label className="nr-label" htmlFor="restaurant-address">
                    restaurant address
                  </label>
                  <input
                    id="restaurant-address"
                    className="nr-input"
                    value={restaurantAddress}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setRestaurantAddress(event.target.value)}
                    maxLength={240}
                    placeholder="optional"
                  />
                </div>
                {unresolvedToppings.length > 0 && (
                  <StatusMessage variant="info" title="some receipt text needs manual review">
                    Could not normalize: {unresolvedToppings.join(", ")}. Search the topping list and
                    select the intended toppings before submitting.
                  </StatusMessage>
                )}
                <ToppingSelector
                  allToppings={allToppings}
                  suggestedToppings={ocrToppings}
                  selected={selectedToppings}
                  onSelectionChange={setSelectedToppings}
                  onSubmit={handleDiscoveryResult}
                  onBack={() => {
                    setOcrToppings(null);
                    setUnresolvedToppings([]);
                    setSelectedToppings([]);
                  }}
                />
              </>
            )}

            {result && (
              <ResultPanel result={result} locationWarning={locationWarning} onReset={resetFlow} />
            )}
          </section>
        )}

        {view === "leaderboard" && <Leaderboard />}
        {view === "my combos" && <HistoryPanel />}
        {view === "map" && <PizzaMap />}
      </main>
    </ResearchShell>
  );
}
