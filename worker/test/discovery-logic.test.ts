import { describe, expect, test } from "bun:test";
import { applyDiscovery, type ComboData } from "../src/discovery-logic";

const existing: ComboData = {
  count: 2,
  tasty: 1,
  notTasty: 1,
  firstDiscoveredAt: "2026-01-01T00:00:00.000Z",
  firstDiscoveredBy: "first-user",
};

describe("applyDiscovery", () => {
  test("creates the first observation", () => {
    const result = applyDiscovery(undefined, undefined, true, "user-1", "2026-07-30T12:00:00.000Z");
    expect(result.isFirst).toBe(true);
    expect(result.isNewObservation).toBe(true);
    expect(result.combo).toMatchObject({ count: 1, tasty: 1, notTasty: 0 });
  });

  test("adds one observation from a new user", () => {
    const result = applyDiscovery(existing, undefined, false, "user-2", "unused");
    expect(result.isFirst).toBe(false);
    expect(result.isNewObservation).toBe(true);
    expect(result.combo).toMatchObject({ count: 3, tasty: 1, notTasty: 2 });
  });

  test("does not count an identical repeat submission", () => {
    const result = applyDiscovery(existing, true, true, "user-2", "unused");
    expect(result.isNewObservation).toBe(false);
    expect(result.ratingChanged).toBe(false);
    expect(result.shouldWriteCombo).toBe(false);
    expect(result.combo).toEqual(existing);
  });

  test("replaces a previous rating without changing observer count", () => {
    const result = applyDiscovery(existing, true, false, "user-2", "unused");
    expect(result.isNewObservation).toBe(false);
    expect(result.ratingChanged).toBe(true);
    expect(result.combo).toMatchObject({ count: 2, tasty: 0, notTasty: 2 });
  });
});
