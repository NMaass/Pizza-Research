import { useState } from "react";
import { api, type DiscoveryResult } from "../api";
import { getUserId, saveDiscovery } from "../userId";

interface Props {
  allToppings: string[];
  suggestedToppings: string[];
  selected: string[];
  onSelectionChange: (toppings: string[]) => void;
  onSubmit: (result: DiscoveryResult) => void;
  onBack: () => void;
}

export function ToppingSelector({
  allToppings,
  suggestedToppings,
  selected,
  onSelectionChange,
  onSubmit,
  onBack,
}: Props) {
  const [search, setSearch] = useState("");
  const [tasty, setTasty] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredToppings = allToppings.filter(
    (t) => t.includes(search.toLowerCase()) && !selected.includes(t)
  );

  const toggleTopping = (topping: string) => {
    if (selected.includes(topping)) {
      onSelectionChange(selected.filter((t) => t !== topping));
    } else if (selected.length < 3) {
      onSelectionChange([...selected, topping]);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0 || tasty === null) return;

    setSubmitting(true);
    setError(null);

    try {
      const userId = getUserId();
      const result = await api.discover(selected, tasty, userId);
      saveDiscovery({
        comboKey: result.comboKey,
        toppings: selected,
        tasty,
        isFirst: result.isFirst,
        timestamp: new Date().toISOString(),
      });
      onSubmit(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel selector-panel">
      <button className="btn-back" onClick={onBack}>&larr; Back</button>
      <h2>Select Your Toppings</h2>
      <p>Choose up to 3 toppings for your combo ({selected.length}/3)</p>

      {suggestedToppings.length > 0 && (
        <div className="suggested">
          <h3>Detected from receipt:</h3>
          <div className="topping-chips">
            {suggestedToppings.map((t) => (
              <button
                key={t}
                className={`chip ${selected.includes(t) ? "selected" : ""}`}
                onClick={() => toggleTopping(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="search-box">
        <input
          type="text"
          placeholder="Search toppings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="topping-grid">
        {filteredToppings.slice(0, 30).map((t) => (
          <button
            key={t}
            className={`chip ${selected.includes(t) ? "selected" : ""}`}
            onClick={() => toggleTopping(t)}
            disabled={selected.length >= 3 && !selected.includes(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="selected-display">
          <h3>Your combo:</h3>
          <div className="topping-chips">
            {selected.map((t) => (
              <button key={t} className="chip selected" onClick={() => toggleTopping(t)}>
                {t} &times;
              </button>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="tasty-vote">
          <h3>Was it tasty?</h3>
          <div className="vote-buttons">
            <button
              className={`btn-vote ${tasty === true ? "active-yes" : ""}`}
              onClick={() => setTasty(true)}
            >
              👍 Tasty
            </button>
            <button
              className={`btn-vote ${tasty === false ? "active-no" : ""}`}
              onClick={() => setTasty(false)}
            >
              👎 Not tasty
            </button>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        className="btn btn-primary"
        disabled={selected.length === 0 || tasty === null || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting..." : "Submit Discovery"}
      </button>
    </div>
  );
}
