# Pizza Research

A volunteer-led effort to discover and eat every unique pizza topping combination. Snap a receipt, the OCR pulls out the toppings, normalize them against the canonical taxonomy, and submit. Each combo can only be discovered once.

## Stack

- React 19 + Vite + TypeScript on the client; Leaflet for the map view
- Cloudflare Worker for the API, with a single SQLite Durable Object tracking combos and discoverers
- KV for the topping taxonomy and cached leaderboards
- OpenRouter (multimodal LLM) for receipt OCR and topping normalization
- Bun runtime; Bun workspaces (`client` / `shared` / `worker`)

## Flow

1. **Upload a receipt.** The client sends a base64 image to `POST /api/ocr`. The worker calls OpenRouter with a vision model to pull out the restaurant, address, and per-pizza toppings.
2. **Match toppings.** Each raw string is fuzzy-matched against the canonical taxonomy in `worker/src/toppings.ts`. Anything unmatched goes through `POST /api/normalize`, which uses the LLM to decide whether the string is a synonym of an existing topping or a genuinely new one — new ones land in KV under `extended_toppings`.
3. **Discover.** A canonical combo key is computed and submitted to `POST /api/discover`. The Durable Object records the first discoverer, increments their score, and returns whether the combo was new.
4. **View.** Tabs for the leaderboard (most common, tastiest, top discoverers), your own history, and a Leaflet map of geocoded pizza shops.

## API

| Method | Path | |
| --- | --- | --- |
| `POST` | `/api/ocr` | Extract toppings + restaurant from a receipt image. |
| `POST` | `/api/normalize` | Resolve an unknown topping against the taxonomy. |
| `POST` | `/api/discover` | Submit a combo. |
| `GET` | `/api/lookup?key=…` | Look up a known combo. |
| `GET` | `/api/leaderboard?type=common\|tasty\|discoverers` | Ranked lists. |
| `GET` | `/api/stats` | Global discovery count. |
| `GET` | `/api/toppings` | Full topping list (base + KV-extended). |
| `GET` | `/api/max-combos` | Theoretical max combinations given the current taxonomy. |

## Local development

Requires Bun.

```sh
bun install
bun run dev:worker    # wrangler dev — runs the worker with bound client assets
bun run dev:client    # vite — useful when iterating on UI in isolation
bun run typecheck
```

Set `OPENROUTER_API_KEY` via `wrangler secret` before exercising the OCR/normalize routes.

## Layout

```
client/    React app — receipt upload, topping picker, map, leaderboard
shared/    Types shared between client and worker
worker/    Cloudflare Worker — routes + ComboTracker Durable Object + LLM glue
```
