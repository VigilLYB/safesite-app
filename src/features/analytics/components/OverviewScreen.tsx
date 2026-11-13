import { useRouter, type Href } from "expo-router";
import type { AnalyticsSummary } from "@/lib/api";
import { formatCount, formatDate, formatDuration } from "@/lib/format";
import { shiftLabel, STATUS_ORDER } from "@/lib/labels";
import { severityTokens } from "@/lib/theme";
import { Card, Grid, Stack, Text } from "@/components/ui";
import { statusLabel, SEVERITIES, severityLabel } from "@/components/domain";
import { EmptyState, ErrorState, TileSkeleton } from "@/components/feedback";
import { useAnalyticsSummary } from "../hooks/useAnalytics";
import { fillBuckets, STATUS_TAB } from "../lib/params";
import { Breakdown } from "./Breakdown";
import type { AnalyticsContentProps } from "./types";

function Tiles({ data }: { data: AnalyticsSummary }) {
  const tiles = [
    ["Reports", formatCount(data.totals.reports)],
    ["Open", formatCount(data.totals.open)],
    ["Duplicates", formatCount(data.totals.duplicates)],
    ["Active actions", formatCount(data.actions.active)],
    ["Overdue actions", formatCount(data.actions.overdue)],
    ["Actions done", formatCount(data.actions.done)],
    ["Avg time to close", formatDuration(data.actions.avgHoursToClose)],
  ] as const;
  return (
    <Grid columns={2} gap={3} testID="kpi-tiles">
      {tiles.map(([label, value]) => (
        <Card key={label} fill testID={`kpi-${label}`}>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          <Text variant="kpi">{value}</Text>
        </Card>
      ))}
    </Grid>
  );
}

/** Analytics overview (guide §4.8): KPIs and breakdowns for the chosen range, shift and severity. */
export function OverviewContent({ state, filters }: AnalyticsContentProps) {
  const router = useRouter();
  const query = useAnalyticsSummary(filters);
  const data = query.data;

  const statusRows = data
    ? fillBuckets(STATUS_ORDER, data.byStatus).map((row) => ({
        key: row.key,
        label: statusLabel[row.key as keyof typeof statusLabel] ?? row.key,
        count: row.count,
        onPress: () =>
          router.push(
            `/incidents?tab=${STATUS_TAB[row.key]}&from=${state.fromDay}&to=${state.toDay}${state.severity ? `&severity=${state.severity}` : ""}` as Href,
          ),
      }))
    : [];

  return (
    <Stack gap={4} testID="overview-content">
      {query.isPending ? <TileSkeleton tiles={7} /> : null}
      {query.isError && !data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {data && data.totals.reports === 0 ? (
        <EmptyState icon="chart" title="No reports in this period" />
      ) : null}
      {data && data.totals.reports > 0 ? (
        <Stack gap={4}>
          <Text variant="caption" tone="muted" testID="range">
            {formatDate(data.range.from)} to{" "}
            {formatDate(new Date(new Date(data.range.to).getTime() - 1).toISOString())} (
            {data.timezone})
          </Text>
          <Tiles data={data} />
          <Grid columns={2} gap={3}>
            <Breakdown title="By status" rows={statusRows} testID="by-status" />
            <Breakdown
              title="By severity"
              testID="by-severity"
              rows={fillBuckets(SEVERITIES, data.bySeverity).map((row) => ({
                key: row.key,
                label: severityLabel[row.key as keyof typeof severityLabel],
                count: row.count,
                color: severityTokens[row.key as keyof typeof severityTokens].fill,
              }))}
            />
            <Breakdown
              title="By shift"
              testID="by-shift"
              rows={(["A", "B", "C"] as const).map((shift) => {
                const found = data.byShift.find((b) => b.key === shift);
                return {
                  key: shift,
                  label: shiftLabel[shift],
                  count: found?.count ?? 0,
                  detail: `Risk score ${formatCount(found?.score ?? 0)}`,
                };
              })}
            />
            <Breakdown
              title="Top areas"
              testID="top-areas"
              rows={data.topAreas.map((area) => ({
                key: area.key,
                label: area.key,
                count: area.count,
                detail: `Risk score ${formatCount(area.score)}`,
              }))}
            />
          </Grid>
          <Card testID="follow-through">
            <Stack gap={2}>
              <Text variant="heading" accessibilityRole="header">
                Actions assigned by
              </Text>
              {data.supervisors.length === 0 ? <Text tone="muted">No actions yet.</Text> : null}
              {data.supervisors.map((s) => (
                <Text key={s.id} variant="caption">
                  {s.fullName}: {s.assigned} assigned, {s.done} done, {s.overdue} overdue
                </Text>
              ))}
            </Stack>
          </Card>
        </Stack>
      ) : null}
    </Stack>
  );
}
