import { extractReceiptData, normalizeTopping } from "./openrouter";
import {
  calculateMaxCombos,
  comboKey,
  getAllToppings,
  matchTopping,
  TOPPING_TAXONOMY,
} from "./toppings";

export { ComboTracker } from "./combo-tracker";

const MAX_IMAGE_BASE64_LENGTH = 4_500_000;
const MAX_EXTENDED_TOPPINGS = 250;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const LEADERBOARD_TYPES = new Set(["common", "tasty", "discoverers"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOPPING_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} &'()+,.\-/]{0,47}$/u;

interface PizzaPin {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Env {
  COMBO_TRACKER: DurableObjectNamespace;
  PIZZA_KV: KVNamespace;
  OPENROUTER_API_KEY: string;
  CORS_ORIGIN: string;
}

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

function getTracker(env: Env): DurableObjectStub {
  return env.COMBO_TRACKER.get(env.COMBO_TRACKER.idFromName("global"));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      if (url.pathname === "/api/toppings" && request.method === "GET") {
        const extended = await getExtendedToppings(env);
        const toppings = uniqueStrings([...getAllToppings(), ...extended]);
        return jsonResponse({ toppings, categories: getCategorized(extended) }, env);
      }

      if (url.pathname === "/api/max-combos" && request.method === "GET") {
        const toppingCount = (await getTaxonomy(env)).length;
        return jsonResponse({ maxCombos: calculateMaxCombos(toppingCount), toppingCount }, env);
      }

      if (url.pathname === "/api/ocr" && request.method === "POST") {
        const body = await readJsonObject(request);
        const image = requireString(body.image, "image");
        const mimeType = requireString(body.mimeType, "mimeType").toLowerCase();
        if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
          throw new HttpError("unsupported receipt image type", 400);
        }
        if (!image || image.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/=]+$/.test(image)) {
          throw new HttpError("receipt image is missing or too large", 400);
        }
        requireOpenRouter(env);

        const extended = await getExtendedToppings(env);
        const receiptData = await extractReceiptData(env.OPENROUTER_API_KEY, image, mimeType);
        const pizzas = receiptData.pizzas.map((pizza) => ({
          label: pizza.label,
          toppings: pizza.toppings.map((raw) => {
            const canonical = canonicalizeOcrTopping(raw, extended);
            return { raw, canonical, matched: canonical !== null };
          }),
        }));

        return jsonResponse(
          {
            pizzas,
            restaurantName: receiptData.restaurantName,
            restaurantAddress: receiptData.restaurantAddress,
          },
          env,
        );
      }

      if (url.pathname === "/api/normalize" && request.method === "POST") {
        const body = await readJsonObject(request);
        const rawTopping = normalizeText(requireString(body.topping, "topping"));
        if (!isSafeToppingName(rawTopping)) {
          throw new HttpError("topping must be a short topping name", 400);
        }

        const extended = await getExtendedToppings(env);
        const directMatch = canonicalizeOcrTopping(rawTopping, extended);
        if (directMatch) return jsonResponse({ action: "match", canonical: directMatch }, env);
        requireOpenRouter(env);

        const taxonomy = uniqueStrings([...getAllToppings(), ...extended]);
        const result = await normalizeTopping(env.OPENROUTER_API_KEY, rawTopping, taxonomy);
        if (result.action === "match") {
          const canonical = canonicalizeExactTopping(result.canonical, extended);
          if (!canonical) throw new HttpError("normalization returned an unknown topping", 502);
          return jsonResponse({ action: "match", canonical }, env);
        }

        const name = normalizeToppingName(result.name);
        if (!isSafeToppingName(name)) {
          throw new HttpError("normalization returned an invalid topping", 502);
        }
        const afterNormalizationMatch = canonicalizeExactTopping(name, extended);
        return afterNormalizationMatch
          ? jsonResponse({ action: "match", canonical: afterNormalizationMatch }, env)
          : jsonResponse({ action: "new", name }, env);
      }

      if (url.pathname === "/api/discover" && request.method === "POST") {
        const body = await readJsonObject(request);
        if (!Array.isArray(body.toppings) || body.toppings.length < 1 || body.toppings.length > 4) {
          throw new HttpError("provide 1-4 toppings", 400);
        }
        if (typeof body.tasty !== "boolean") throw new HttpError("tasty must be true or false", 400);
        const userId = requireString(body.userId, "userId").trim();
        if (!UUID_PATTERN.test(userId)) throw new HttpError("invalid userId", 400);

        const extended = await getExtendedToppings(env);
        const canonicalToppings: string[] = [];
        const pendingAdditions: string[] = [];
        for (const value of body.toppings) {
          if (typeof value !== "string") throw new HttpError("each topping must be text", 400);
          const currentExtended = uniqueStrings([...extended, ...pendingAdditions]);
          const existingCanonical = canonicalizeExactTopping(value, currentExtended);
          if (existingCanonical) {
            canonicalToppings.push(existingCanonical);
            continue;
          }

          const rawTopping = normalizeText(value);
          if (!isSafeToppingName(rawTopping)) {
            throw new HttpError(`invalid topping: ${value}`, 400);
          }
          requireOpenRouter(env);
          const taxonomy = uniqueStrings([...getAllToppings(), ...currentExtended]);
          const normalized = await normalizeTopping(env.OPENROUTER_API_KEY, rawTopping, taxonomy);
          if (normalized.action === "match") {
            const canonical = canonicalizeExactTopping(normalized.canonical, currentExtended);
            if (!canonical) throw new HttpError("normalization returned an unknown topping", 502);
            canonicalToppings.push(canonical);
            continue;
          }

          const name = normalizeToppingName(normalized.name);
          if (!isSafeToppingName(name)) {
            throw new HttpError("normalization returned an invalid topping", 502);
          }
          const normalizedExisting = canonicalizeExactTopping(name, currentExtended);
          if (normalizedExisting) {
            canonicalToppings.push(normalizedExisting);
          } else {
            pendingAdditions.push(name);
            canonicalToppings.push(name);
          }
        }
        if (new Set(canonicalToppings).size !== canonicalToppings.length) {
          throw new HttpError("duplicate toppings are not allowed", 400);
        }

        const key = comboKey(canonicalToppings);
        const doResponse = await getTracker(env).fetch(
          new Request("https://combo-tracker/discover", {
            method: "POST",
            body: JSON.stringify({ comboKey: key, tasty: body.tasty, userId }),
          }),
        );
        if (!doResponse.ok) throw new HttpError("could not record discovery", 502);
        const discoveryResult = await doResponse.json();

        if (pendingAdditions.length > 0) {
          const latestExtended = await getExtendedToppings(env);
          const nextExtended = uniqueStrings([...latestExtended, ...pendingAdditions]);
          if (nextExtended.length > MAX_EXTENDED_TOPPINGS) {
            throw new HttpError("discovery was recorded, but the extended topping taxonomy is full", 409);
          }
          await env.PIZZA_KV.put("extended_toppings", JSON.stringify(nextExtended));
        }

        return jsonResponse(discoveryResult, env);
      }

      if (url.pathname === "/api/lookup" && request.method === "GET") {
        const requestedKey = url.searchParams.get("key");
        if (!requestedKey) throw new HttpError("missing key parameter", 400);
        const parts = requestedKey.split("|");
        if (parts.length < 1 || parts.length > 4) throw new HttpError("invalid combo key", 400);
        const extended = await getExtendedToppings(env);
        const canonical = parts.map((part) => {
          const topping = canonicalizeExactTopping(part, extended);
          if (!topping) throw new HttpError("invalid combo key", 400);
          return topping;
        });
        if (new Set(canonical).size !== canonical.length) throw new HttpError("invalid combo key", 400);

        const key = comboKey(canonical);
        const doResponse = await getTracker(env).fetch(
          new Request(`https://combo-tracker/lookup?key=${encodeURIComponent(key)}`),
        );
        if (!doResponse.ok) throw new HttpError("could not look up combo", 502);
        return jsonResponse(await doResponse.json(), env);
      }

      if (url.pathname === "/api/leaderboard" && request.method === "GET") {
        const type = url.searchParams.get("type") ?? "common";
        if (!LEADERBOARD_TYPES.has(type)) throw new HttpError("invalid leaderboard type", 400);
        const limit = sanitizeLimit(url.searchParams.get("limit"));
        const doResponse = await getTracker(env).fetch(
          new Request(`https://combo-tracker/leaderboard?type=${type}&limit=${limit}`),
        );
        if (!doResponse.ok) throw new HttpError("could not load leaderboard", 502);
        return jsonResponse(await doResponse.json(), env);
      }

      if (url.pathname === "/api/stats" && request.method === "GET") {
        const doResponse = await getTracker(env).fetch(new Request("https://combo-tracker/stats"));
        if (!doResponse.ok) throw new HttpError("could not load statistics", 502);
        const result = await doResponse.json();
        const toppingCount = (await getTaxonomy(env)).length;
        return jsonResponse(
          { ...(result as object), maxCombos: calculateMaxCombos(toppingCount), toppingCount },
          env,
        );
      }

      if (url.pathname === "/api/pins" && request.method === "GET") {
        return jsonResponse({ pins: await getPins(env) }, env);
      }

      if (url.pathname === "/api/geocode" && request.method === "POST") {
        const body = await readJsonObject(request);
        const address = normalizeText(requireString(body.address, "address"));
        const restaurantName = optionalString(body.restaurantName, 120) ?? "unknown";
        const userId = requireString(body.userId, "userId").trim();
        const requestedKey = requireString(body.comboKey, "comboKey");
        if (!address || address.length > 240) throw new HttpError("address is required", 400);
        if (!UUID_PATTERN.test(userId)) throw new HttpError("invalid userId", 400);

        const comboParts = requestedKey.split("|");
        if (comboParts.length < 1 || comboParts.length > 4) throw new HttpError("invalid combo key", 400);
        const extended = await getExtendedToppings(env);
        const canonicalParts = comboParts.map((part) => {
          const canonical = canonicalizeExactTopping(part, extended);
          if (!canonical) throw new HttpError("invalid combo key", 400);
          return canonical;
        });
        if (new Set(canonicalParts).size !== canonicalParts.length) throw new HttpError("invalid combo key", 400);
        const key = comboKey(canonicalParts);
        const observedResponse = await getTracker(env).fetch(
          new Request(
            `https://combo-tracker/observed?key=${encodeURIComponent(key)}&userId=${encodeURIComponent(userId)}`,
          ),
        );
        if (!observedResponse.ok) throw new HttpError("could not verify discovery", 502);
        const observation = (await observedResponse.json()) as { observed?: unknown };
        if (observation.observed !== true) {
          throw new HttpError("record the combo before adding its restaurant", 403);
        }

        const query = new URLSearchParams({ q: address, format: "json", limit: "1" });
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
          headers: { "User-Agent": "PizzaResearch/1.0" },
        });
        if (!geoResponse.ok) throw new HttpError("geocoding service is unavailable", 502);
        const geoData = (await geoResponse.json()) as unknown;
        const coordinates = firstCoordinates(geoData);
        if (!coordinates) throw new HttpError("could not geocode address", 404);

        const existing = await getPins(env);
        const normalizedAddress = address.toLowerCase();
        const existingIndex = existing.findIndex(
          (pin) => normalizeText(pin.address).toLowerCase() === normalizedAddress,
        );
        const pin: PizzaPin = { name: restaurantName, address, ...coordinates };
        if (existingIndex >= 0) existing[existingIndex] = pin;
        else existing.push(pin);
        await env.PIZZA_KV.put("pizza_pins", JSON.stringify(existing));
        return jsonResponse(pin, env);
      }

      return jsonResponse({ error: "not found" }, env, 404);
    } catch (cause) {
      const status = cause instanceof HttpError ? cause.status : 500;
      const message = cause instanceof Error ? cause.message : "internal error";
      return jsonResponse({ error: message }, env, status);
    }
  },
};

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpError("request body must be a JSON object", 400);
    }
    return value as Record<string, unknown>;
  } catch (cause) {
    if (cause instanceof HttpError) throw cause;
    throw new HttpError("request body must be valid JSON", 400);
  }
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new HttpError(`${field} must be text`, 400);
  return value;
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new HttpError("optional text field is invalid", 400);
  const normalized = normalizeText(value);
  if (normalized.length > maxLength) throw new HttpError("optional text field is too long", 400);
  return normalized || null;
}

function requireOpenRouter(env: Env): void {
  if (!env.OPENROUTER_API_KEY) throw new HttpError("receipt analysis is not configured", 503);
}

async function getExtendedToppings(env: Env): Promise<string[]> {
  const value = (await env.PIZZA_KV.get("extended_toppings", "json")) as unknown;
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .map(normalizeToppingName)
      .filter(isSafeToppingName),
  ).slice(0, MAX_EXTENDED_TOPPINGS);
}

async function getTaxonomy(env: Env): Promise<string[]> {
  return uniqueStrings([...getAllToppings(), ...(await getExtendedToppings(env))]);
}

function canonicalizeExactTopping(input: string, extended: string[]): string | null {
  const normalized = normalizeToppingName(input);
  for (const entry of TOPPING_TAXONOMY) {
    if (normalizeToppingName(entry.canonical) === normalized) return entry.canonical;
    if (entry.aliases.some((alias) => normalizeToppingName(alias) === normalized)) {
      return entry.canonical;
    }
  }
  return extended.find((entry) => normalizeToppingName(entry) === normalized) ?? null;
}

function canonicalizeOcrTopping(input: string, extended: string[]): string | null {
  const exact = canonicalizeExactTopping(input, extended);
  if (exact) return exact;
  return matchTopping(input);
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeToppingName(value: string): string {
  return normalizeText(value).toLowerCase();
}

function isSafeToppingName(value: string): boolean {
  return value.length >= 1 && value.length <= 48 && TOPPING_PATTERN.test(value) && !value.includes("|");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function getCategorized(extended: string[]): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  for (const entry of TOPPING_TAXONOMY) {
    (categories[entry.category] ??= []).push(entry.canonical);
  }
  if (extended.length > 0) {
    categories.other = uniqueStrings([...(categories.other ?? []), ...extended]);
  }
  return categories;
}

function sanitizeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "20", 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : 20;
}

async function getPins(env: Env): Promise<PizzaPin[]> {
  const value = (await env.PIZZA_KV.get("pizza_pins", "json")) as unknown;
  return Array.isArray(value) ? value.filter(isPizzaPin) : [];
}

function isPizzaPin(value: unknown): value is PizzaPin {
  if (!value || typeof value !== "object") return false;
  const pin = value as Partial<PizzaPin>;
  return (
    typeof pin.name === "string" &&
    typeof pin.address === "string" &&
    typeof pin.lat === "number" &&
    Number.isFinite(pin.lat) &&
    pin.lat >= -90 &&
    pin.lat <= 90 &&
    typeof pin.lng === "number" &&
    Number.isFinite(pin.lng) &&
    pin.lng >= -180 &&
    pin.lng <= 180
  );
}

function firstCoordinates(value: unknown): { lat: number; lng: number } | null {
  if (!Array.isArray(value) || value.length === 0 || !value[0] || typeof value[0] !== "object") {
    return null;
  }
  const first = value[0] as { lat?: unknown; lon?: unknown };
  const lat = typeof first.lat === "string" ? Number.parseFloat(first.lat) : Number.NaN;
  const lng = typeof first.lon === "string" ? Number.parseFloat(first.lon) : Number.NaN;
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}
