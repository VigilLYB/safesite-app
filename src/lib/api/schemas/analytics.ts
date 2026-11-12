import { z } from "zod";

/** byStatus / bySeverity carry only a count; byShift / topAreas add a severity-weighted score. */
const countBucket = z.object({ key: z.string(), count: z.number() });
const scoredBucket = countBucket.extend({ score: z.number() });

export const heatmapSchema = z.object({
  blueprint: z.object({ id: z.string(), widthPx: z.number(), heightPx: z.number() }),
  range: z.object({ from: z.string(), to: z.string() }),
  cellSize: z.number(),
  cells: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      centerX: z.number(),
      centerY: z.number(),
      count: z.number(),
      score: z.number(),
      intensity: z.number(),
    }),
  ),
  areas: z.array(
    z.object({ areaId: z.string(), name: z.string(), count: z.number(), score: z.number() }),
  ),
  totals: z.object({ reports: z.number() }),
});
export type Heatmap = z.infer<typeof heatmapSchema>;

export const analyticsSummarySchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  timezone: z.string(),
  totals: z.object({ reports: z.number(), duplicates: z.number(), open: z.number() }),
  byStatus: z.array(countBucket),
  bySeverity: z.array(countBucket),
  byShift: z.array(scoredBucket.extend({ name: z.string() })),
  topAreas: z.array(scoredBucket),
  actions: z.object({
    total: z.number(),
    active: z.number(),
    overdue: z.number(),
    done: z.number(),
    avgHoursToClose: z.number().nullable(),
  }),
  supervisors: z.array(
    z.object({
      id: z.string(),
      fullName: z.string(),
      assigned: z.number(),
      done: z.number(),
      overdue: z.number(),
    }),
  ),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

export const analyticsTrendsSchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  bucket: z.enum(["week", "day"]),
  points: z.array(
    z.object({
      period: z.string(),
      category: z.string(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      count: z.number(),
    }),
  ),
});
export type AnalyticsTrends = z.infer<typeof analyticsTrendsSchema>;
