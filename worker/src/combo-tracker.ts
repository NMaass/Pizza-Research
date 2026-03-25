/**
 * ComboTracker Durable Object
 *
 * Stores all pizza topping combo discoveries.
 * Each combo key (sorted toppings joined by "|") maps to:
 *   - count: total discoveries
 *   - tasty: number of "tasty" ratings
 *   - notTasty: number of "not tasty" ratings
 *   - firstDiscoveredAt: ISO timestamp
 *   - firstDiscoveredBy: user ID
 */

export interface ComboData {
  count: number;
  tasty: number;
  notTasty: number;
  firstDiscoveredAt: string;
  firstDiscoveredBy: string;
}

export interface DiscoveryResult {
  isFirst: boolean;
  combo: ComboData;
  comboKey: string;
}

export class ComboTracker implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/discover":
        return this.handleDiscover(request);
      case "/lookup":
        return this.handleLookup(url);
      case "/leaderboard":
        return this.handleLeaderboard(url);
      case "/stats":
        return this.handleStats();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  private async handleDiscover(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      comboKey: string;
      tasty: boolean;
      userId: string;
    };

    const existing = await this.state.storage.get<ComboData>(body.comboKey);
    const isFirst = !existing;

    const combo: ComboData = existing ?? {
      count: 0,
      tasty: 0,
      notTasty: 0,
      firstDiscoveredAt: new Date().toISOString(),
      firstDiscoveredBy: body.userId,
    };

    combo.count++;
    if (body.tasty) {
      combo.tasty++;
    } else {
      combo.notTasty++;
    }

    await this.state.storage.put(body.comboKey, combo);

    // Update discoverer's count
    const discovererKey = `user:${body.userId}`;
    const userCount = ((await this.state.storage.get<number>(discovererKey)) ?? 0) + 1;
    await this.state.storage.put(discovererKey, userCount);

    const result: DiscoveryResult = { isFirst, combo, comboKey: body.comboKey };
    return Response.json(result);
  }

  private async handleLookup(url: URL): Promise<Response> {
    const key = url.searchParams.get("key");
    if (!key) return new Response("Missing key", { status: 400 });

    const combo = await this.state.storage.get<ComboData>(key);
    if (!combo) return Response.json({ found: false });

    return Response.json({ found: true, combo });
  }

  private async handleLeaderboard(url: URL): Promise<Response> {
    const type = url.searchParams.get("type") ?? "common";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);

    // Get all combo entries (filter out user keys)
    const all = await this.state.storage.list<ComboData>();
    const combos: Array<{ key: string; data: ComboData }> = [];
    const users: Array<{ userId: string; count: number }> = [];

    for (const [key, value] of all) {
      if (key.startsWith("user:")) {
        users.push({ userId: key.slice(5), count: value as unknown as number });
      } else {
        combos.push({ key, data: value as ComboData });
      }
    }

    if (type === "discoverers") {
      users.sort((a, b) => b.count - a.count);
      return Response.json({ leaderboard: users.slice(0, limit) });
    }

    if (type === "tasty") {
      // Sort by tastiness percentage (min 3 ratings to qualify)
      const rated = combos
        .filter((c) => c.data.count >= 3)
        .map((c) => ({
          ...c,
          tastiness: c.data.tasty / (c.data.tasty + c.data.notTasty),
        }))
        .sort((a, b) => b.tastiness - a.tastiness);
      return Response.json({ leaderboard: rated.slice(0, limit) });
    }

    // Default: most common
    combos.sort((a, b) => b.data.count - a.data.count);
    return Response.json({ leaderboard: combos.slice(0, limit) });
  }

  private async handleStats(): Promise<Response> {
    const all = await this.state.storage.list();
    let comboCount = 0;
    let totalDiscoveries = 0;

    for (const [key, value] of all) {
      if (!key.startsWith("user:")) {
        comboCount++;
        totalDiscoveries += (value as ComboData).count;
      }
    }

    return Response.json({ comboCount, totalDiscoveries });
  }
}
