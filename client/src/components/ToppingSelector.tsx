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

  const filtered = allToppings.filter(
    (t) => t.includes(search.toLowerCase()) && !selected.includes(t)
  );

  const toggle = (topping: string) => {
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
      setError(err instanceof Error ? err.message : "submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-block",
    padding: "0.25rem 0.625rem",
    fontSize: "0.8125rem",
    border: "1px solid " + (active ? "#111" : "#ddd"),
    borderRadius: "1px",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div style={{ maxWidth: "480px", width: "100%" }}>
      <span
        onClick={onBack}
        style={{ fontSize: "0.8125rem", color: "#888", cursor: "pointer" }}
      >
        &larr; back
      </span>

      <p style={{ fontSize: "0.875rem", margin: "1rem 0 0.5rem", color: "#666" }}>
        choose up to 3 toppings ({selected.length}/3)
      </p>

      {suggestedToppings.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#888", marginBottom: "0.375rem" }}>
            detected from receipt:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {suggestedToppings.map((t) => (
              <span key={t} onClick={() => toggle(t)} style={chipStyle(selected.includes(t))}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="search toppings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "0.5rem 0.625rem",
          fontSize: "0.875rem",
          border: "1px solid #eee",
          borderRadius: "1px",
          outline: "none",
          marginBottom: "0.75rem",
        }}
      />

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.375rem",
        maxHeight: "200px",
        overflowY: "auto",
        marginBottom: "1rem",
      }}>
        {filtered.slice(0, 40).map((t) => (
          <span
            key={t}
            onClick={() => toggle(t)}
            style={{
              ...chipStyle(selected.includes(t)),
              opacity: selected.length >= 3 && !selected.includes(t) ? 0.3 : 1,
              pointerEvents: selected.length >= 3 && !selected.includes(t) ? "none" : "auto",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {selected.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#888", marginBottom: "0.375rem" }}>
            your combo:
          </p>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {selected.map((t) => (
              <span key={t} onClick={() => toggle(t)} style={chipStyle(true)}>
                {t} &times;
              </span>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#888", marginBottom: "0.375rem" }}>
            was it tasty?
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[true, false].map((val) => (
              <span
                key={String(val)}
                onClick={() => setTasty(val)}
                style={{
                  padding: "0.375rem 1rem",
                  fontSize: "0.875rem",
                  border: "1px solid " + (tasty === val ? "#111" : "#eee"),
                  borderRadius: "1px",
                  cursor: "pointer",
                  background: tasty === val ? "#111" : "#fff",
                  color: tasty === val ? "#fff" : "#111",
                }}
              >
                {val ? "yes" : "no"}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.8125rem", color: "#c00", marginBottom: "0.5rem" }}>{error}</p>
      )}

      <span
        onClick={selected.length > 0 && tasty !== null && !submitting ? handleSubmit : undefined}
        style={{
          fontSize: "0.875rem",
          cursor: selected.length > 0 && tasty !== null && !submitting ? "pointer" : "default",
          textDecoration: "underline",
          color: selected.length > 0 && tasty !== null ? "#111" : "#ccc",
        }}
      >
        {submitting ? "submitting..." : "submit discovery"}
      </span>
    </div>
  );
}
