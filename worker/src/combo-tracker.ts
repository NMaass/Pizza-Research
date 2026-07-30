import { applyDiscovery, type ComboData } from "./discovery-logic";

export type { ComboData } from "./discovery-logic";

export interface DiscoveryResult {
  isFirst: boolean;
  isNewObservation: boolean;
  ratingChanged: boolean;
  combo: ComboData;
  comboKey: string;
}

export class ComboTracker implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/discover":
        return this.handleDiscover(request);
      case "/lookup":
        return this.handleLookup(url);
      case "/observed":
        return this.handleObserved(url);
      case "/leaderboard":
        return this.handleLeaderboard(url);
      case "/stats":
        return this.handleStats();
      default:
        return Response.json({ error: "not found" }, { status: 404 });
    }
  }

  private async handleDiscover(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      comboKey: string;
      tasty: boolean;
      userId: string;
    };
    const observationKey = createObservationKey(body.userId, body.comboKey);

    const result = await this.state.storage.transaction(async (transaction) => {
      const [existing, previousRating] = await Promise.all([
        transaction.get<ComboData>(body.comboKey),
        transaction.get<boolean>(observationKey),
      ]);
      const transition = applyDiscovery(
        existing,
        previousRating,
        body.tasty,
        body.userId,
        new Date().toISOString(),
      );

      if (transition.shouldWriteCombo) {
        await transaction.put(body.comboKey, transition.combo);
      }
      if (transition.shouldWriteObservation) {
        await transaction.put(observationKey, body.tasty);
      }
      return {
        isFirst: transition.isFirst,
        isNewObservation: transition.isNewObservation,
        ratingChanged: transition.ratingChanged,
        combo: transition.combo,
        comboKey: body.comboKey,
      } satisfies DiscoveryResult;
    });

    return Response.json(result);
  }

  private async handleLookup(url: URL): Promise<Response> {
    const key = url.searchParams.get("key");
    if (!key) return Response.json({ error: "missing key" }, { status: 400 });

    const combo = await this.state.storage.get<ComboData>(key);
    return combo ? Response.json({ found: true, combo }) : Response.json({ found: false });
  }

  private async handleObserved(url: URL): Promise<Response> {
    const comboKey = url.searchParams.get("key");
    const userId = url.searchParams.get("userId");
    if (!comboKey || !userId) {
      return Response.json({ error: "missing observation key" }, { status: 400 });
    }
    const rating = await this.state.storage.get<boolean>(createObservationKey(userId, comboKey));
    return Response.json({ observed: rating !== undefined });
  }

  private async handleLeaderboard(url: URL): Promise<Response> {
    const type = url.searchParams.get("type") ?? "common";
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;
    const all = await this.state.storage.list<unknown>();
    const combos: Array<{ key: string; data: ComboData }> = [];
    for (const [key, value] of all) {
      if (isComboStorageKey(key) && isComboData(value)) {
        combos.push({ key, data: value });
      }
    }

    if (type === "discoverers") {
      const counts = new Map<string, number>();
      for (const entry of combos) {
        counts.set(
          entry.data.firstDiscoveredBy,
          (counts.get(entry.data.firstDiscoveredBy) ?? 0) + 1,
        );
      }
      const users = [...counts].map(([userId, count]) => ({ userId, count }));
      users.sort((left, right) => right.count - left.count || left.userId.localeCompare(right.userId));
      return Response.json({ leaderboard: users.slice(0, limit) });
    }

    if (type === "tasty") {
      const rated = combos
        .filter((entry) => entry.data.count >= 3)
        .map((entry) => ({
          ...entry,
          tastiness: entry.data.tasty / Math.max(1, entry.data.tasty + entry.data.notTasty),
        }))
        .sort(
          (left, right) =>
            right.tastiness - left.tastiness ||
            right.data.count - left.data.count ||
            left.key.localeCompare(right.key),
        );
      return Response.json({ leaderboard: rated.slice(0, limit) });
    }

    combos.sort(
      (left, right) => right.data.count - left.data.count || left.key.localeCompare(right.key),
    );
    return Response.json({ leaderboard: combos.slice(0, limit) });
  }

  private async handleStats(): Promise<Response> {
    const all = await this.state.storage.list<unknown>();
    let comboCount = 0;
    let totalDiscoveries = 0;

    for (const [key, value] of all) {
      if (isComboStorageKey(key) && isComboData(value)) {
        comboCount += 1;
        totalDiscoveries += value.count;
      }
    }

    return Response.json({ comboCount, totalDiscoveries });
  }
}

function createObservationKey(userId: string, comboKey: string): string {
  return `submission:${userId}:${encodeURIComponent(comboKey)}`;
}

function isComboStorageKey(key: string): boolean {
  return !key.startsWith("user:") && !key.startsWith("submission:");
}

function isComboData(value: unknown): value is ComboData {
  if (!value || typeof value !== "object") return false;
  const combo = value as Partial<ComboData>;
  return (
    typeof combo.count === "number" &&
    typeof combo.tasty === "number" &&
    typeof combo.notTasty === "number" &&
    typeof combo.firstDiscoveredAt === "string" &&
    typeof combo.firstDiscoveredBy === "string"
  );
}
