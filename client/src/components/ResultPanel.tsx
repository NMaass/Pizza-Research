import type { DiscoveryResult } from "../api";
import { Button, StatusMessage } from "../research-ui";
import { ProgressBar } from "./ProgressBar";

interface Props {
  result: DiscoveryResult;
  locationWarning: string | null;
  onReset: () => void;
}

export function ResultPanel({ result, locationWarning, onReset }: Props) {
  const { isFirst, isNewObservation, ratingChanged, combo, comboKey } = result;
  const toppings = comboKey.split("|");
  const totalVotes = combo.tasty + combo.notTasty;
  const tastiness = totalVotes > 0 ? combo.tasty / totalVotes : null;

  let title = "already recorded";
  let description = "this browser has already submitted this combo with the same rating";
  let variant: "success" | "found" | "info" = "info";

  if (isFirst) {
    title = "first ever discovery";
    description = "you are the first person to record this combination";
    variant = "success";
  } else if (isNewObservation) {
    title = "discovery recorded";
    description = "this is a new observation from this browser";
    variant = "found";
  } else if (ratingChanged) {
    title = "rating updated";
    description = "your previous rating was replaced without increasing the discovery count";
    variant = "found";
  }

  return (
    <div className="pizza-result">
      <StatusMessage variant={variant} title={title}>
        {description}
      </StatusMessage>

      <div className="pizza-chip-list pizza-result-toppings">
        {toppings.map((topping) => (
          <span key={topping} className="pizza-static-chip">
            {topping}
          </span>
        ))}
      </div>

      <p className="nr-muted pizza-result-count">
        {combo.count} unique {combo.count === 1 ? "observer" : "observers"} recorded this combo
      </p>

      {tastiness !== null && (
        <div className="pizza-rating-summary">
          <ProgressBar fraction={tastiness} />
          <p className="nr-muted pizza-small-label">
            {Math.round(tastiness * 100)}% tasty ({totalVotes} {totalVotes === 1 ? "vote" : "votes"})
          </p>
        </div>
      )}

      {locationWarning && (
        <StatusMessage variant="error" title="map update failed">
          {locationWarning}
        </StatusMessage>
      )}

      <Button variant="quiet" onClick={onReset}>
        discover another combo
      </Button>
    </div>
  );
}
