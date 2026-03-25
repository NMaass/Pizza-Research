const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return res.json();
}

export interface ToppingMatch {
  raw: string;
  canonical: string | null;
  matched: boolean;
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

export const api = {
  getToppings: () =>
    apiFetch<{ toppings: string[]; categories: Record<string, string[]> }>("/api/toppings"),

  getMaxCombos: () =>
    apiFetch<{ maxCombos: number; toppingCount: number }>("/api/max-combos"),

  ocr: (image: string, mimeType: string) =>
    apiFetch<{ toppings: ToppingMatch[] }>("/api/ocr", {
      method: "POST",
      body: JSON.stringify({ image, mimeType }),
    }),

  normalize: (topping: string) =>
    apiFetch<{ action: string; canonical?: string; name?: string }>("/api/normalize", {
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

  getLeaderboard: (type: "common" | "tasty" | "discoverers", limit = 20) =>
    apiFetch<{ leaderboard: LeaderboardEntry[] }>(
      `/api/leaderboard?type=${type}&limit=${limit}`
    ),
};
