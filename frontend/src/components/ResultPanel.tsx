import type { DiscoveryResult } from "../api";

interface Props {
  result: DiscoveryResult;
  onReset: () => void;
}

export function ResultPanel({ result, onReset }: Props) {
  const { isFirst, combo, comboKey } = result;
  const toppings = comboKey.split("|");
  const tastiness =
    combo.tasty + combo.notTasty > 0
      ? Math.round((combo.tasty / (combo.tasty + combo.notTasty)) * 100)
      : null;

  return (
    <div className="panel result-panel">
      {isFirst ? (
        <div className="first-discovery">
          <h2>🎉 First Ever Discovery!</h2>
          <p>You're the first person to discover this combo!</p>
        </div>
      ) : (
        <div className="existing-discovery">
          <h2>Combo Found!</h2>
          <p>
            <strong>{combo.count}</strong> {combo.count === 1 ? "person has" : "people have"} discovered this combo
          </p>
        </div>
      )}

      <div className="combo-display">
        <div className="topping-chips">
          {toppings.map((t) => (
            <span key={t} className="chip result-chip">{t}</span>
          ))}
        </div>
      </div>

      {tastiness !== null && (
        <div className="tastiness">
          <div className="tastiness-bar">
            <div
              className="tastiness-fill"
              style={{ width: `${tastiness}%` }}
            />
          </div>
          <span className="tastiness-text">
            {tastiness}% tastiness rating ({combo.tasty + combo.notTasty} votes)
          </span>
        </div>
      )}

      <button className="btn btn-primary" onClick={onReset}>
        Discover Another Combo
      </button>
    </div>
  );
}
