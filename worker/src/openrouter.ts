/**
 * OpenRouter API integration for:
 * 1. Vision OCR — extract toppings and restaurant info from receipt photos
 * 2. Topping normalization — decide if a new topping matches existing taxonomy
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens = 1024
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
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
    const err = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

export interface ReceiptData {
  toppings: string[];
  restaurantName: string | null;
  restaurantAddress: string | null;
}

/**
 * Extract pizza toppings and restaurant info from a receipt image using a vision model.
 */
export async function extractReceiptData(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<ReceiptData> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const result = await callOpenRouter(
    apiKey,
    "nvidia/nemotron-nano-12b-v2-vl:free",
    [
      {
        role: "system",
        content:
          'You are a pizza receipt reader. Extract the pizza toppings, restaurant name, and restaurant address from the receipt image. Return a JSON object with this exact format: {"toppings": ["pepperoni", "mushrooms"], "restaurantName": "Giordano\'s", "restaurantAddress": "730 N Rush St, Chicago, IL 60611"}. If you cannot find toppings, return an empty array for toppings. If you cannot find the restaurant name or address, use null for those fields. Do not include crust types, sizes, or non-topping items in toppings. Return ONLY the JSON object, nothing else.',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the pizza toppings and restaurant info from this receipt:" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ]
  );

  try {
    const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      toppings: Array.isArray(parsed.toppings)
        ? parsed.toppings.map((t: unknown) => String(t).trim()).filter(Boolean)
        : [],
      restaurantName: typeof parsed.restaurantName === "string" ? parsed.restaurantName : null,
      restaurantAddress: typeof parsed.restaurantAddress === "string" ? parsed.restaurantAddress : null,
    };
  } catch {
    // Fallback: try to extract toppings from text
    const lines = result.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
    return {
      toppings: lines,
      restaurantName: null,
      restaurantAddress: null,
    };
  }
}

/**
 * Extract pizza toppings from a receipt image using a vision model.
 * Returns a list of raw topping strings found on the receipt.
 * (Backwards-compatible wrapper around extractReceiptData)
 */
export async function extractToppingsFromImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<string[]> {
  const data = await extractReceiptData(apiKey, imageBase64, mimeType);
  return data.toppings;
}

/**
 * Normalize a topping: ask a cheap LLM if it matches an existing canonical topping
 * or if it should be added as a new entry.
 */
export async function normalizeTopping(
  apiKey: string,
  rawTopping: string,
  existingToppings: string[]
): Promise<{ action: "match"; canonical: string } | { action: "new"; name: string }> {
  const result = await callOpenRouter(
    apiKey,
    "google/gemini-2.0-flash-001",
    [
      {
        role: "system",
        content: `You are a pizza topping taxonomy manager. Given a topping name and the current taxonomy list, decide:
1. If it matches an existing topping (same thing, different name), respond: {"action":"match","canonical":"<existing name>"}
2. If it's genuinely new, respond: {"action":"new","name":"<normalized lowercase name>"}

Current taxonomy: ${JSON.stringify(existingToppings)}

Respond with ONLY the JSON object, nothing else.`,
      },
      {
        role: "user",
        content: `Is "${rawTopping}" a new topping or does it match something in the taxonomy?`,
      },
    ],
    256
  );

  try {
    const cleaned = result.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { action: "new", name: rawTopping.toLowerCase().trim() };
  }
}
