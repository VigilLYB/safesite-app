import { analyticsSummarySchema } from "./analytics";

/** Shaped exactly like GET /v1/analytics/summary from the deployed API (12 Nov 2026). */
const liveSummary = {
  range: { from: "2026-10-13T00:00:00.000Z", to: "2026-11-12T00:00:00.000Z" },
  timezone: "Asia/Kolkata",
  totals: { reports: 43, duplicates: 23, open: 30 },
  byStatus: [{ key: "OPEN", count: 30 }],
  bySeverity: [
    { key: "MEDIUM", count: 22 },
    { key: "CRITICAL", count: 6 },
  ],
  byShift: [{ key: "B", count: 43, score: 117, name: "Afternoon" }],
  topAreas: [{ key: "Unpinned", count: 33, score: 83 }],
  actions: { total: 7, active: 2, overdue: 0, done: 5, avgHoursToClose: null },
  supervisors: [],
};

describe("analytics summary schema", () => {
  it("accepts status and severity buckets without a score (the real API omits it)", () => {
    expect(analyticsSummarySchema.safeParse(liveSummary).success).toBe(true);
  });

  it("still requires the score on shift and area buckets", () => {
    const broken = { ...liveSummary, topAreas: [{ key: "Unpinned", count: 1 }] };
    expect(analyticsSummarySchema.safeParse(broken).success).toBe(false);
  });
});
