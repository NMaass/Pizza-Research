const STORAGE_KEY = "pizza_research_user_id";
const DISCOVERIES_KEY = "pizza_research_discoveries";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let memoryUserId: string | null = null;

export function getUserId(): string {
  if (memoryUserId) return memoryUserId;

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && UUID_PATTERN.test(existing)) {
      memoryUserId = existing;
      return existing;
    }
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  const id = createUuid();
  memoryUserId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Keep the in-memory identity for the current page session.
  }
  return id;
}

export interface LocalDiscovery {
  comboKey: string;
  toppings: string[];
  tasty: boolean;
  isFirst: boolean;
  timestamp: string;
}

export function saveDiscovery(discovery: LocalDiscovery): void {
  const existing = getDiscoveries();
  const previous = existing.find((entry) => entry.comboKey === discovery.comboKey);
  const next: LocalDiscovery = {
    ...discovery,
    isFirst: discovery.isFirst || previous?.isFirst === true,
    timestamp: previous?.timestamp ?? discovery.timestamp,
  };
  const updated = [next, ...existing.filter((entry) => entry.comboKey !== discovery.comboKey)].slice(0, 500);

  try {
    localStorage.setItem(DISCOVERIES_KEY, JSON.stringify(updated));
  } catch {
    // Server recording succeeded even when local history cannot be persisted.
  }
}

export function getDiscoveries(): LocalDiscovery[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DISCOVERIES_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLocalDiscovery).slice(0, 500);
  } catch {
    return [];
  }
}

function isLocalDiscovery(value: unknown): value is LocalDiscovery {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalDiscovery>;
  return (
    typeof candidate.comboKey === "string" &&
    Array.isArray(candidate.toppings) &&
    candidate.toppings.every((topping) => typeof topping === "string") &&
    typeof candidate.tasty === "boolean" &&
    typeof candidate.isFirst === "boolean" &&
    typeof candidate.timestamp === "string"
  );
}

function createUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
    (
      Number(character) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(character) / 4)))
    ).toString(16),
  );
}
