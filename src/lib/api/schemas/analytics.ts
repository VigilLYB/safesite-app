import { z } from "zod";

const bucket = z.object({ key: z.string(), count: z.number(), score: z.number() });

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
  byStatus: z.array(bucket),
  bySeverity: z.array(bucket),
  byShift: z.array(bucket.extend({ name: z.string() })),
  topAreas: z.array(bucket),
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
