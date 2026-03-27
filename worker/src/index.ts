/**
 * Pizza Research — Cloudflare Worker entry point
 *
 * Routes:
 *   POST /api/ocr          — Extract toppings from receipt image
 *   POST /api/normalize     — Normalize unknown topping against taxonomy
 *   POST /api/discover      — Submit a combo discovery
 *   GET  /api/lookup?key=   — Look up a combo
 *   GET  /api/leaderboard   — Leaderboard (type=common|tasty|discoverers)
 *   GET  /api/stats         — Global stats
 *   GET  /api/toppings      — Full topping list
 *   GET  /api/max-combos    — Max possible combos
 */

import { getAllToppings, matchTopping, calculateMaxCombos, comboKey, TOPPING_TAXONOMY } from "./toppings";
import { extractReceiptData, normalizeTopping } from "./openrouter";

export { ComboTracker } from "./combo-tracker";

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
  // Single global instance for all combo tracking
  const id = env.COMBO_TRACKER.idFromName("global");
  return env.COMBO_TRACKER.get(id);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    try {
      // --- Static data endpoints ---
      if (url.pathname === "/api/toppings" && request.method === "GET") {
        // Check KV for cached extended taxonomy
        const extended = await env.PIZZA_KV.get("extended_toppings", "json");
        const base = getAllToppings();
        const all = extended ? [...base, ...(extended as string[])] : base;
        return jsonResponse({ toppings: all, categories: getCategorized() }, env);
      }

      if (url.pathname === "/api/max-combos" && request.method === "GET") {
        const extended = await env.PIZZA_KV.get("extended_toppings", "json");
        const extraCount = extended ? (extended as string[]).length : 0;
        const n = getAllToppings().length + extraCount;
        const maxCombos = calculateMaxCombos(n);
        return jsonResponse({ maxCombos, toppingCount: n }, env);
      }

      // --- OCR endpoint ---
      if (url.pathname === "/api/ocr" && request.method === "POST") {
        const body = (await request.json()) as {
          image: string; // base64
          mimeType: string;
        };

        const receiptData = await extractReceiptData(
          env.OPENROUTER_API_KEY,
          body.image,
          body.mimeType
        );

        // Try to match each raw topping to canonical
        const matched = receiptData.toppings.map((raw) => {
          const canonical = matchTopping(raw);
          return { raw, canonical, matched: canonical !== null };
        });

        return jsonResponse({
          toppings: matched,
          restaurantName: receiptData.restaurantName,
          restaurantAddress: receiptData.restaurantAddress,
        }, env);
      }

      // --- Normalize unknown topping ---
      if (url.pathname === "/api/normalize" && request.method === "POST") {
        const body = (await request.json()) as { topping: string };
        const existing = getAllToppings();

        // Also include any extended toppings from KV
        const extended = await env.PIZZA_KV.get("extended_toppings", "json");
        if (extended) existing.push(...(extended as string[]));

        const result = await normalizeTopping(env.OPENROUTER_API_KEY, body.topping, existing);

        // If it's a new topping, add to KV extended list
        if (result.action === "new") {
          const current = ((await env.PIZZA_KV.get("extended_toppings", "json")) as string[]) ?? [];
          if (!current.includes(result.name)) {
            current.push(result.name);
            await env.PIZZA_KV.put("extended_toppings", JSON.stringify(current));
          }
        }

        return jsonResponse(result, env);
      }

      // --- Discovery endpoint ---
      if (url.pathname === "/api/discover" && request.method === "POST") {
        const body = (await request.json()) as {
          toppings: string[];
          tasty: boolean;
          userId: string;
        };

        if (!body.toppings?.length || body.toppings.length > 4) {
          return jsonResponse({ error: "Provide 1-4 toppings" }, env, 400);
        }
        if (!body.userId) {
          return jsonResponse({ error: "userId required" }, env, 400);
        }

        const key = comboKey(body.toppings);
        const tracker = getTracker(env);

        const doResponse = await tracker.fetch(
          new Request("https://do/discover", {
            method: "POST",
            body: JSON.stringify({ comboKey: key, tasty: body.tasty, userId: body.userId }),
          })
        );

        const result = await doResponse.json();
        return jsonResponse(result, env);
      }

      // --- Lookup endpoint ---
      if (url.pathname === "/api/lookup" && request.method === "GET") {
        const key = url.searchParams.get("key");
        if (!key) return jsonResponse({ error: "Missing key param" }, env, 400);

        const tracker = getTracker(env);
        const doResponse = await tracker.fetch(
          new Request(`https://do/lookup?key=${encodeURIComponent(key)}`)
        );
        const result = await doResponse.json();
        return jsonResponse(result, env);
      }

      // --- Leaderboard endpoint ---
      if (url.pathname === "/api/leaderboard" && request.method === "GET") {
        const type = url.searchParams.get("type") ?? "common";
        const limit = url.searchParams.get("limit") ?? "20";

        const tracker = getTracker(env);
        const doResponse = await tracker.fetch(
          new Request(`https://do/leaderboard?type=${type}&limit=${limit}`)
        );
        const result = await doResponse.json();
        return jsonResponse(result, env);
      }

      // --- Stats endpoint ---
      if (url.pathname === "/api/stats" && request.method === "GET") {
        const tracker = getTracker(env);
        const doResponse = await tracker.fetch(new Request("https://do/stats"));
        const result = await doResponse.json();

        // Add max combos info
        const extended = await env.PIZZA_KV.get("extended_toppings", "json");
        const extraCount = extended ? (extended as string[]).length : 0;
        const n = getAllToppings().length + extraCount;
        const maxCombos = calculateMaxCombos(n);

        return jsonResponse({ ...(result as object), maxCombos, toppingCount: n }, env);
      }

      // --- Pins endpoint ---
      if (url.pathname === "/api/pins" && request.method === "GET") {
        const pins = await env.PIZZA_KV.get("pizza_pins", "json") as PizzaPin[] | null;
        return jsonResponse({ pins: pins ?? [] }, env);
      }

      // --- Geocode endpoint ---
      if (url.pathname === "/api/geocode" && request.method === "POST") {
        const body = (await request.json()) as {
          address: string;
          restaurantName?: string;
        };

        if (!body.address) {
          return jsonResponse({ error: "address required" }, env, 400);
        }

        const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(body.address)}&format=json&limit=1`;
        const geoRes = await fetch(geoUrl, {
          headers: { "User-Agent": "PizzaResearch/1.0" },
        });
        const geoData = (await geoRes.json()) as Array<{ lat: string; lon: string }>;

        if (!geoData.length) {
          return jsonResponse({ error: "Could not geocode address" }, env, 404);
        }

        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);

        // Store pin in KV
        const existing = (await env.PIZZA_KV.get("pizza_pins", "json") as PizzaPin[] | null) ?? [];
        const alreadyExists = existing.some(
          (p) => p.address === body.address
        );
        if (!alreadyExists) {
          existing.push({
            name: body.restaurantName ?? "unknown",
            address: body.address,
            lat,
            lng,
          });
          await env.PIZZA_KV.put("pizza_pins", JSON.stringify(existing));
        }

        return jsonResponse({ lat, lng, name: body.restaurantName ?? "unknown", address: body.address }, env);
      }

      return jsonResponse({ error: "Not found" }, env, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      return jsonResponse({ error: message }, env, 500);
    }
  },
};

function getCategorized(): Record<string, string[]> {
  const categories: Record<string, string[]> = {};
  for (const entry of TOPPING_TAXONOMY) {
    if (!categories[entry.category]) categories[entry.category] = [];
    categories[entry.category].push(entry.canonical);
  }
  return categories;
}
