export interface ComboData {
  count: number;
  tasty: number;
  notTasty: number;
  firstDiscoveredAt: string;
  firstDiscoveredBy: string;
}

export interface DiscoveryTransition {
  combo: ComboData;
  isFirst: boolean;
  isNewObservation: boolean;
  ratingChanged: boolean;
  shouldWriteCombo: boolean;
  shouldWriteObservation: boolean;
}

export function applyDiscovery(
  existing: ComboData | undefined,
  previousRating: boolean | undefined,
  tasty: boolean,
  userId: string,
  now: string,
): DiscoveryTransition {
  const isFirst = existing === undefined;
  const observationExists = existing !== undefined && previousRating !== undefined;
  const isNewObservation = !observationExists;
  const ratingChanged = observationExists && previousRating !== tasty;
  const combo: ComboData = existing
    ? { ...existing }
    : {
        count: 0,
        tasty: 0,
        notTasty: 0,
        firstDiscoveredAt: now,
        firstDiscoveredBy: userId,
      };

  if (isNewObservation) {
    combo.count += 1;
    if (tasty) combo.tasty += 1;
    else combo.notTasty += 1;
  } else if (ratingChanged) {
    if (previousRating) combo.tasty = Math.max(0, combo.tasty - 1);
    else combo.notTasty = Math.max(0, combo.notTasty - 1);

    if (tasty) combo.tasty += 1;
    else combo.notTasty += 1;
  }

  return {
    combo,
    isFirst,
    isNewObservation,
    ratingChanged,
    shouldWriteCombo: isNewObservation || ratingChanged,
    shouldWriteObservation: isNewObservation || ratingChanged,
  };
}
