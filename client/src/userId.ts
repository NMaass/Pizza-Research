const STORAGE_KEY = "pizza_research_user_id";

export function getUserId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

const DISCOVERIES_KEY = "pizza_research_discoveries";

export interface LocalDiscovery {
  comboKey: string;
  toppings: string[];
  tasty: boolean;
  isFirst: boolean;
  timestamp: string;
}

export function saveDiscovery(discovery: LocalDiscovery): void {
  const existing = getDiscoveries();
  existing.unshift(discovery);
  localStorage.setItem(DISCOVERIES_KEY, JSON.stringify(existing.slice(0, 500)));
}

export function getDiscoveries(): LocalDiscovery[] {
  const raw = localStorage.getItem(DISCOVERIES_KEY);
  return raw ? JSON.parse(raw) : [];
}
