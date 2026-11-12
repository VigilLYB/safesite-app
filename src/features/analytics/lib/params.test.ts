import { setClock } from "@/lib/clock";
import { fillBuckets, parseAnalyticsParams, toAnalyticsFilters } from "./params";

beforeAll(() =>
  setClock({
    now: () => new Date("2026-11-12T06:00:00Z"),
    nowMs: () => Date.parse("2026-11-12T06:00:00Z"),
  }),
);

describe("analytics params", () => {
  it("defaults to the last 30 plant days with an exclusive end", () => {
    const f = toAnalyticsFilters(parseAnalyticsParams({}));
    expect(f.from).toBe("2026-10-13T18:30:00.000Z");
    expect(f.to).toBe("2026-11-12T18:30:00.000Z");
  });
  it("never sends areaId; drops bad shift and falls back on a backwards range", () => {
    const s = parseAnalyticsParams({
      shift: "D",
      from: "2026-11-12",
      to: "2026-11-01",
      areaId: "x",
    });
    expect(s.shift).toBeUndefined();
    expect(s.fromDay <= s.toDay).toBe(true);
    expect(toAnalyticsFilters(s)).not.toHaveProperty("areaId");
  });
  it("clamps cell size to 10–500", () => {
    expect(parseAnalyticsParams({ cellSize: "5" }).cellSize).toBe(10);
    expect(parseAnalyticsParams({ cellSize: "900" }).cellSize).toBe(500);
  });
  it("fills missing buckets with 0 in a fixed order", () => {
    expect(fillBuckets(["A", "B", "C"], [{ key: "C", count: 4 }])).toEqual([
      { key: "A", count: 0 },
      { key: "B", count: 0 },
      { key: "C", count: 4 },
    ]);
  });
});
