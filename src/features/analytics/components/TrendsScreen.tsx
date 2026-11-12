import { useMemo } from "react";
import { formatDate } from "@/lib/format";
import { Stack, Text } from "@/components/ui";
import { EmptyState, ErrorState, TileSkeleton } from "@/components/feedback";
import { useTrends } from "../hooks/useAnalytics";
import { Breakdown, type BreakdownRow } from "./Breakdown";
import type { AnalyticsContentProps } from "./types";

/** Reports per week, by hazard category — a persistent hazard shows up as a rising count. */
export function TrendsContent({ filters }: AnalyticsContentProps) {
  const query = useTrends(filters, "week");
  const data = query.data;

  const byWeek: BreakdownRow[] = useMemo(() => {
    if (!data) return [];
    const totals = new Map<string, number>();
    for (const point of data.points)
      totals.set(point.period, (totals.get(point.period) ?? 0) + point.count);
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ key: period, label: formatDate(period), count }));
  }, [data]);

  const byCategory: BreakdownRow[] = useMemo(() => {
    if (!data) return [];
    const totals = new Map<string, number>();
    for (const point of data.points)
      totals.set(point.category, (totals.get(point.category) ?? 0) + point.count);
    return [...totals.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ key: category, label: category, count }));
  }, [data]);

  const total = byWeek.reduce((n, row) => n + row.count, 0);

  return (
    <Stack gap={4} testID="trends-screen">
      {query.isPending ? <TileSkeleton tiles={4} /> : null}
      {query.isError && !data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {data && total === 0 ? <EmptyState icon="chart" title="No reports in this period" /> : null}
      {data && total > 0 ? (
        <Stack gap={4}>
          <Text variant="caption" tone="muted" testID="range">
            {formatDate(data.range.from)} to{" "}
            {formatDate(new Date(new Date(data.range.to).getTime() - 1).toISOString())}
          </Text>
          <Breakdown title="By week" testID="by-week" rows={byWeek} />
          <Breakdown title="By hazard type" testID="by-category" rows={byCategory} />
        </Stack>
      ) : null}
    </Stack>
  );
}
