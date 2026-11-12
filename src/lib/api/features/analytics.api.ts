import { request, type Query } from "../client";
import { endpoints } from "../registry";
import { analyticsSummarySchema, heatmapSchema, type Severity } from "../schemas";

export interface AnalyticsFilters extends Query {
  from?: string | undefined;
  to?: string | undefined;
  shift?: "A" | "B" | "C" | undefined;
  severity?: Severity | undefined;
  activeOnly?: boolean | undefined;
  blueprintId?: string | undefined;
}

export const analyticsApi = {
  summary: (filters: AnalyticsFilters, signal?: AbortSignal) =>
    request({
      endpoint: endpoints.summary,
      query: filters,
      schema: analyticsSummarySchema,
      signal,
    }),
  heatmap: (
    filters: AnalyticsFilters & { blueprintId: string; cellSize?: number | undefined },
    signal?: AbortSignal,
  ) => request({ endpoint: endpoints.heatmap, query: filters, schema: heatmapSchema, signal }),
};
