import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatDate } from "@/lib/format";
import { Screen, ScreenHeader, Stack, Text } from "@/components/ui";
import { EmptyState, ErrorState, TileSkeleton } from "@/components/feedback";
import { useTrends } from "../hooks/useAnalytics";
import {
  parseAnalyticsParams,
  toAnalyticsFilters,
  toUrl,
  type AnalyticsState,
} from "../lib/params";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsTabs } from "./AnalyticsTabs";
import { Breakdown, type BreakdownRow } from "./Breakdown";

/** Reports per week, by hazard category — a persistent hazard shows up as a rising count. */
export function TrendsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const state = useMemo(() => parseAnalyticsParams(params as never), [params]);
  const filters = useMemo(() => toAnalyticsFilters(state), [state]);
  const query = useTrends(filters, "week");
  const update = (patch: Partial<AnalyticsState>) =>
    router.setParams(toUrl({ ...state, ...patch }));
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
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      testID="trends-screen"
    >
      <ScreenHeader title="Trends" subtitle="Reports per week, by hazard type." />
      <AnalyticsTabs current="trends" query={toUrl(state)} />
      <AnalyticsFilterBar state={state} onChange={update} />
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
    </Screen>
  );
}
