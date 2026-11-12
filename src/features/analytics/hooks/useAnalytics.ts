import { useQuery } from "@tanstack/react-query";
import { analyticsApi, analyticsKeys, compact, type AnalyticsFilters } from "@/lib/api";

export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.summary(compact(filters)),
    queryFn: ({ signal }) => analyticsApi.summary(filters, signal),
    placeholderData: (previous) => previous,
  });
}

export function useHeatmap(
  filters: AnalyticsFilters,
  blueprintId: string | undefined,
  cellSize: number,
) {
  // The heatmap requires a blueprint; the summary-only `blueprintId` filter is replaced by it.
  const query = { ...filters, blueprintId, cellSize };
  return useQuery({
    queryKey: analyticsKeys.heatmap(compact(query)),
    queryFn: ({ signal }) =>
      analyticsApi.heatmap({ ...filters, blueprintId: blueprintId as string, cellSize }, signal),
    enabled: Boolean(blueprintId),
    placeholderData: (previous) => previous,
  });
}
