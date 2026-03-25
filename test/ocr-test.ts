/**
 * Quick OCR test — send a receipt image to OpenRouter and see what toppings come back.
 *
 * Usage:
 *   bun run test/ocr-test.ts <path-to-image>
 *
 * Reads OPENROUTER_API_KEY from worker/.dev.vars
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const devVars = readFileSync(resolve(__dirname, "../worker/.dev.vars"), "utf-8");
const apiKey = devVars.match(/OPENROUTER_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) {
  console.error("No OPENROUTER_API_KEY found in worker/.dev.vars");
  process.exit(1);
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("Usage: bun run test/ocr-test.ts <path-to-image>");
  process.exit(1);
}

const imageBuffer = readFileSync(resolve(imagePath));
const base64 = imageBuffer.toString("base64");

// Guess mime type from extension
const ext = imagePath.split(".").pop()?.toLowerCase();
const mimeMap: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const mimeType = mimeMap[ext ?? ""] ?? "image/jpeg";

console.log(`Sending ${imagePath} (${(imageBuffer.length / 1024).toFixed(1)}KB) to OCR...\n`);

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://pizza-research.pages.dev",
    "X-Title": "Pizza Research",
  },
  body: JSON.stringify({
    model: "nvidia/nemotron-nano-12b-v2-vl:free",
    messages: [
      {
        role: "system",
        content:
          'You are a pizza receipt reader. Extract ONLY the pizza toppings from the receipt image. Return a JSON array of topping strings, nothing else. Example: ["pepperoni", "mushrooms", "green peppers"]. If no pizza toppings are found, return []. Do not include crust types, sizes, or non-topping items.',
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the pizza toppings from this receipt:" },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.1,
  }),
});

if (!response.ok) {
  console.error(`API error ${response.status}:`, await response.text());
  process.exit(1);
}

const data = (await response.json()) as {
  choices: Array<{ message: { content: string } }>;
};

const raw = data.choices[0]?.message?.content ?? "";
console.log("Raw response:", raw);

try {
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log("\nParsed toppings:", parsed);
} catch {
  console.log("\n(Could not parse as JSON)");
}
