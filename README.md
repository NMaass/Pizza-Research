# Pizza Research

A volunteer-led effort to discover and eat every unique one-to-four-topping pizza combination in a shared taxonomy. Snap a receipt, choose the specific pizza line item, review the normalized toppings, and submit it. Each browser identity can record a combination once and can later replace its taste rating without inflating the discovery count.

## Stack

- React 19 + Vite + TypeScript on the client; Leaflet for the map view
- Cloudflare Worker for the API, with a SQLite Durable Object tracking combinations, first discoverers, and per-user observations
- KV for the extended topping taxonomy and geocoded pizza shops
- OpenRouter multimodal models for receipt reading and topping normalization
- Bun runtime and Bun workspaces (`client` / `shared` / `worker`)

## Flow

1. **Upload a receipt.** The client resizes the image and sends it to `POST /api/ocr`. The worker separates distinct pizza line items instead of merging toppings from multiple pizzas.
2. **Choose and review one pizza.** When a receipt contains multiple pizzas, the user selects the one being recorded. Known toppings are matched against the canonical taxonomy; unmatched text is sent to `POST /api/normalize` for a proposed canonical name.
3. **Discover.** The selected one-to-four-topping combination is submitted to `POST /api/discover`. Unknown proposed toppings are revalidated server-side and only added to the extended taxonomy when the discovery succeeds.
4. **Count correctly.** The Durable Object records one observation per browser identity and combination. Repeating the same submission is idempotent; changing the taste rating replaces the previous vote.
5. **View.** The app includes combination and discoverer leaderboards, browser-local history, global progress, and a map of shops attached to verified observations.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/ocr` | Extract separate pizza line items, toppings, and restaurant details from a receipt image. |
| `POST` | `/api/normalize` | Propose a canonical match or new topping name without mutating the taxonomy. |
| `POST` | `/api/discover` | Validate and record one combination observation or rating update. |
| `GET` | `/api/lookup?key=...` | Look up a known canonical combination. |
| `GET` | `/api/leaderboard?type=common\|tasty\|discoverers` | Return ranked combinations or first discoverers. |
| `GET` | `/api/stats` | Return global discovery totals and theoretical progress. |
| `GET` | `/api/toppings` | Return the base and extended topping taxonomy. |
| `GET` | `/api/max-combos` | Return the theoretical one-to-four-topping combination count. |
| `GET` | `/api/pins` | Return geocoded pizza shops. |
| `POST` | `/api/geocode` | Add or update a shop after verifying the caller recorded the combination. |

## Local development

Requires Bun.

```sh
bun install
bun run dev:worker
bun run dev:client
bun run typecheck
bun test
```

Set `OPENROUTER_API_KEY` with `wrangler secret put OPENROUTER_API_KEY` before exercising OCR or normalization routes.

## Layout

```text
client/    React application and receipt review flow
shared/    Shared response types
worker/    Cloudflare Worker, Durable Object, taxonomy, and model integration
```
