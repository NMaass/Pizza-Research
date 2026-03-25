import type { DiscoveryResult } from "../api";
import { ProgressBar } from "./ProgressBar";

interface Props {
  result: DiscoveryResult;
  onReset: () => void;
}

export function ResultPanel({ result, onReset }: Props) {
  const { isFirst, combo, comboKey } = result;
  const toppings = comboKey.split("|");
  const totalVotes = combo.tasty + combo.notTasty;
  const tastiness = totalVotes > 0 ? combo.tasty / totalVotes : null;

  return (
    <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
      {isFirst ? (
        <>
          <p style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>first ever discovery</p>
          <p style={{ fontSize: "0.8125rem", color: "#888" }}>
            you're the first person to discover this combo
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>combo found</p>
          <p style={{ fontSize: "0.8125rem", color: "#888" }}>
            {combo.count} {combo.count === 1 ? "person has" : "people have"} discovered this
          </p>
        </>
      )}

      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "0.375rem",
        margin: "1.25rem 0",
        flexWrap: "wrap",
      }}>
        {toppings.map((t) => (
          <span key={t} style={{
            padding: "0.25rem 0.625rem",
            fontSize: "0.875rem",
            border: "1px solid #111",
            borderRadius: "1px",
          }}>
            {t}
          </span>
        ))}
      </div>

      {tastiness !== null && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.375rem",
          marginBottom: "1.5rem",
        }}>
          <ProgressBar fraction={tastiness} />
          <p style={{ fontSize: "0.8125rem", color: "#888" }}>
            {Math.round(tastiness * 100)}% tasty ({totalVotes} votes)
          </p>
        </div>
      )}

      <span
        onClick={onReset}
        style={{ fontSize: "0.875rem", cursor: "pointer", textDecoration: "underline" }}
      >
        discover another combo
      </span>
    </div>
  );
}
