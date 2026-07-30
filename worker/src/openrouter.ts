interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens = 1024,
): Promise<string> {
  if (!apiKey) throw new Error("OpenRouter is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://pizza-research.pages.dev",
        "X-Title": "Pizza Research",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenRouter returned an empty response");
    }
    return content;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("OpenRouter request timed out");
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

export interface ReceiptPizza {
  label: string | null;
  toppings: string[];
}

export interface ReceiptData {
  pizzas: ReceiptPizza[];
  restaurantName: string | null;
  restaurantAddress: string | null;
}

export async function extractReceiptData(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<ReceiptData> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const result = await callOpenRouter(
    apiKey,
    "nvidia/nemotron-nano-12b-v2-vl:free",
    [
      {
        role: "system",
        content:
          'You are a pizza receipt reader. Return exactly one JSON object shaped like {"pizzas":[{"label":"large pizza","toppings":["pepperoni"]}],"restaurantName":"Example Pizza","restaurantAddress":"123 Main St"}. Create one pizzas entry for each distinct pizza line item and never merge toppings from separate pizzas. A quantity of two identical pizzas may be one entry. Use an empty pizzas array when no pizza line item is legible and null for missing restaurant fields. Extract only toppings actually printed on the receipt; do not infer ingredients from a specialty pizza name. Exclude crusts, sizes, quantities, coupons, sides, and non-pizza items from toppings. Do not return prose or markdown.',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Read the pizza line items on this receipt." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  );

  const parsed = parseJsonObject(result);
  const rawPizzas = Array.isArray(parsed.pizzas)
    ? parsed.pizzas
    : Array.isArray(parsed.toppings)
      ? [{ label: null, toppings: parsed.toppings }]
      : [];

  const pizzas = rawPizzas
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value))
    .map((pizza) => ({
      label: optionalString(pizza.label, 80),
      toppings: normalizeToppingList(pizza.toppings),
    }))
    .filter((pizza) => pizza.toppings.length > 0)
    .slice(0, 8);

  return {
    pizzas,
    restaurantName: optionalString(parsed.restaurantName, 120),
    restaurantAddress: optionalString(parsed.restaurantAddress, 240),
  };
}

export async function normalizeTopping(
  apiKey: string,
  rawTopping: string,
  existingToppings: string[],
): Promise<{ action: "match"; canonical: string } | { action: "new"; name: string }> {
  const result = await callOpenRouter(
    apiKey,
    "google/gemini-2.0-flash-001",
    [
      {
        role: "system",
        content: `You manage a pizza topping taxonomy. Decide whether the supplied topping is a synonym of an existing entry or a genuinely distinct topping. Return only {"action":"match","canonical":"<exact existing entry>"} or {"action":"new","name":"<short normalized lowercase name>"}. Never add sizes, crusts, quantities, restaurant names, coupons, or preparation instructions. Existing taxonomy: ${JSON.stringify(existingToppings)}`,
      },
      {
        role: "user",
        content: `Classify this receipt topping: ${JSON.stringify(rawTopping)}`,
      },
    ],
    256,
  );

  const parsed = parseJsonObject(result);
  if (parsed.action === "match" && typeof parsed.canonical === "string") {
    const requested = normalizeText(parsed.canonical).toLowerCase();
    const canonical = existingToppings.find((entry) => entry.toLowerCase() === requested);
    if (!canonical) throw new Error("normalization returned an unknown canonical topping");
    return { action: "match", canonical };
  }

  if (parsed.action === "new" && typeof parsed.name === "string") {
    const name = normalizeText(parsed.name).toLowerCase();
    if (!name) throw new Error("normalization returned an empty topping");
    return { action: "new", name };
  }

  throw new Error("normalization returned an invalid result");
}

function normalizeToppingList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((entry): entry is string => typeof entry === "string")
      .map(normalizeText)
      .filter((entry) => entry.length > 0 && entry.length <= 64),
  )].slice(0, 12);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const candidates = [withoutFence];
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(withoutFence.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next bounded JSON candidate.
    }
  }
  throw new Error("model returned invalid JSON");
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeText(value);
  return normalized ? normalized.slice(0, maxLength) : null;
}
