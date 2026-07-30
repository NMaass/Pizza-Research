export interface ComboData {
  count: number;
  tasty: number;
  notTasty: number;
  firstDiscoveredAt: string;
  firstDiscoveredBy: string;
}

export interface DiscoveryResult {
  isFirst: boolean;
  isNewObservation: boolean;
  ratingChanged: boolean;
  combo: ComboData;
  comboKey: string;
}

export interface ToppingMatch {
  raw: string;
  canonical: string | null;
  matched: boolean;
}

export interface Stats {
  comboCount: number;
  totalDiscoveries: number;
  maxCombos: number;
  toppingCount: number;
}

export interface LeaderboardComboEntry {
  key: string;
  data: ComboData;
  tastiness?: number;
}

export interface LeaderboardDiscovererEntry {
  userId: string;
  count: number;
}
