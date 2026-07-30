import { useMemo, useState, type CSSProperties } from "react";
import { api, type DiscoveryResult } from "../api";
import { Button, StatusMessage } from "../research-ui";
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...new Set(allToppings)]
      .filter((topping) => topping.toLowerCase().includes(query) && !selected.includes(topping))
      .sort((left, right) => left.localeCompare(right));
  }, [allToppings, search, selected]);

  const toggle = (topping: string) => {
    if (submitting) return;
    if (selected.includes(topping)) {
      onSelectionChange(selected.filter((entry) => entry !== topping));
    } else if (selected.length < 4) {
      onSelectionChange([...selected, topping]);
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0 || tasty === null || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.discover(selected, tasty, getUserId());
      saveDiscovery({
        comboKey: result.comboKey,
        toppings: result.comboKey.split("|"),
        tasty,
        isFirst: result.isFirst,
        timestamp: new Date().toISOString(),
      });
      onSubmit(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const chipStyle = (active: boolean): CSSProperties => ({
    display: "inline-block",
    padding: "0.25rem 0.625rem",
    fontSize: "0.8125rem",
    border: `1px solid ${active ? "#111" : "#ddd"}`,
    borderRadius: "1px",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
  });

  return (
    <div className="pizza-selector">
      <Button variant="quiet" onClick={onBack} disabled={submitting}>
        &larr; back
      </Button>

      <p className="nr-muted pizza-selector-heading">
        choose up to 4 toppings ({selected.length}/4)
      </p>

      {suggestedToppings.length > 0 && (
        <section className="pizza-selection-group" aria-labelledby="detected-toppings-label">
          <p id="detected-toppings-label" className="nr-muted pizza-small-label">
            detected from receipt:
          </p>
          <div className="pizza-chip-list">
            {suggestedToppings.map((topping) => (
              <button
                key={topping}
                type="button"
                aria-pressed={selected.includes(topping)}
                disabled={submitting || (selected.length >= 4 && !selected.includes(topping))}
                onClick={() => toggle(topping)}
                style={chipStyle(selected.includes(topping))}
              >
                {topping}
              </button>
            ))}
          </div>
        </section>
      )}

      <label className="nr-label pizza-small-label" htmlFor="topping-search">
        search toppings
      </label>
      <input
        id="topping-search"
        className="nr-input"
        type="search"
        placeholder="pepperoni, mushrooms, hot honey..."
        value={search}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
        disabled={submitting}
      />

      <div className="pizza-chip-list pizza-topping-results" aria-label="available toppings">
        {filtered.slice(0, 60).map((topping) => (
          <button
            key={topping}
            type="button"
            disabled={submitting || selected.length >= 4}
            onClick={() => toggle(topping)}
            style={chipStyle(false)}
          >
            {topping}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <section className="pizza-selection-group" aria-labelledby="selected-toppings-label">
          <p id="selected-toppings-label" className="nr-muted pizza-small-label">
            your combo:
          </p>
          <div className="pizza-chip-list">
            {selected.map((topping) => (
              <button
                key={topping}
                type="button"
                disabled={submitting}
                onClick={() => toggle(topping)}
                style={chipStyle(true)}
                aria-label={`remove ${topping}`}
              >
                {topping} &times;
              </button>
            ))}
          </div>
        </section>
      )}

      {selected.length > 0 && (
        <fieldset className="pizza-rating-group" disabled={submitting}>
          <legend className="nr-muted pizza-small-label">was it tasty?</legend>
          <div className="pizza-chip-list">
            <Button
              aria-pressed={tasty === true}
              variant={tasty === true ? "primary" : "default"}
              onClick={() => setTasty(true)}
            >
              yes
            </Button>
            <Button
              aria-pressed={tasty === false}
              variant={tasty === false ? "primary" : "default"}
              onClick={() => setTasty(false)}
            >
              no
            </Button>
          </div>
        </fieldset>
      )}

      {error && (
        <StatusMessage variant="error" title="could not record discovery">
          {error}
        </StatusMessage>
      )}

      <Button
        variant="primary"
        disabled={selected.length === 0 || tasty === null || submitting}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "submitting..." : "submit discovery"}
      </Button>
    </div>
  );
}
