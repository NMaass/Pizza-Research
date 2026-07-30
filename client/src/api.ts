const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) throw new Error("server returned an invalid response");
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : response.statusText || "request failed";
    throw new Error(message);
  }

  return payload as T;
}

export interface ToppingMatch {
  raw: string;
  canonical: string | null;
  matched: boolean;
}

export interface ReceiptPizzaMatch {
  label: string | null;
  toppings: ToppingMatch[];
}

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

export interface Stats {
  comboCount: number;
  totalDiscoveries: number;
  maxCombos: number;
  toppingCount: number;
}

export interface LeaderboardEntry {
  key: string;
  data: ComboData;
  tastiness?: number;
}

export interface DiscovererLeaderboardEntry {
  userId: string;
  count: number;
}

export interface PizzaPin {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export type NormalizeToppingResult =
  | { action: "match"; canonical: string }
  | { action: "new"; name: string };

export const api = {
  getToppings: () =>
    apiFetch<{ toppings: string[]; categories: Record<string, string[]> }>("/api/toppings"),

  getMaxCombos: () =>
    apiFetch<{ maxCombos: number; toppingCount: number }>("/api/max-combos"),

  ocr: (image: string, mimeType: string) =>
    apiFetch<{
      pizzas: ReceiptPizzaMatch[];
      restaurantName: string | null;
      restaurantAddress: string | null;
    }>("/api/ocr", {
      method: "POST",
      body: JSON.stringify({ image, mimeType }),
    }),

  normalize: (topping: string) =>
    apiFetch<NormalizeToppingResult>("/api/normalize", {
      method: "POST",
      body: JSON.stringify({ topping }),
    }),

  discover: (toppings: string[], tasty: boolean, userId: string) =>
    apiFetch<DiscoveryResult>("/api/discover", {
      method: "POST",
      body: JSON.stringify({ toppings, tasty, userId }),
    }),

  lookup: (key: string) =>
    apiFetch<{ found: boolean; combo?: ComboData }>(`/api/lookup?key=${encodeURIComponent(key)}`),

  getStats: () => apiFetch<Stats>("/api/stats"),

  getLeaderboard: (type: "common" | "tasty", limit = 20) =>
    apiFetch<{ leaderboard: LeaderboardEntry[] }>(
      `/api/leaderboard?type=${type}&limit=${limit}`,
    ),

  getDiscovererLeaderboard: (limit = 20) =>
    apiFetch<{ leaderboard: DiscovererLeaderboardEntry[] }>(
      `/api/leaderboard?type=discoverers&limit=${limit}`,
    ),

  getPins: () => apiFetch<{ pins: PizzaPin[] }>("/api/pins"),

  geocode: (
    address: string,
    restaurantName: string | undefined,
    comboKey: string,
    userId: string,
  ) =>
    apiFetch<PizzaPin>("/api/geocode", {
      method: "POST",
      body: JSON.stringify({ address, restaurantName, comboKey, userId }),
    }),
};
