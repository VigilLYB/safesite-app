import { StyleSheet, View } from "react-native";
import { humanize } from "@/lib/format";
import { space } from "@/lib/theme";
import { Screen, ScreenHeader, Stack, SeverityShape } from "@/components/ui";
import { QueryBoundary } from "@/components/feedback";
import { SEVERITIES, severityLabel, statusLabel } from "@/components/domain";
import type { IncidentStatus } from "@/lib/api";
import { useAnalyticsControls, useAnalyticsSummary } from "../hooks/useAnalytics";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { BreakdownBars } from "./BreakdownBars";
import { KpiStrip } from "./KpiStrip";
import { SupervisorTable } from "./SupervisorTable";

/** Site-wide safety picture: KPIs first, then where and when risk concentrates. */
export function OverviewScreen() {
  const controls = useAnalyticsControls();
  const query = useAnalyticsSummary(controls.filters);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <ScreenHeader eyebrow="Plant X" title="Plant risk overview" />
      <AnalyticsFilterBar controls={controls} />
      <QueryBoundary query={query}>
        {(summary) => (
          <Stack gap={4}>
            <KpiStrip summary={summary} />
            <View style={styles.grid}>
              <View style={styles.cell}>
                <BreakdownBars
                  title="Reports by severity"
                  rows={SEVERITIES.map((severity) => ({
                    key: severity,
                    label: severityLabel[severity],
                    count: summary.bySeverity.find((bucket) => bucket.key === severity)?.count ?? 0,
                    leading: <SeverityShape severity={severity} size={18} />,
                  })).reverse()}
                />
              </View>
              <View style={styles.cell}>
                <BreakdownBars
                  title="Reports by status"
                  rows={summary.byStatus.map((bucket) => ({
                    key: bucket.key,
                    label: statusLabel[bucket.key as IncidentStatus] ?? humanize(bucket.key),
                    count: bucket.count,
                  }))}
                />
              </View>
              <View style={styles.cell}>
                <BreakdownBars
                  title="Reports by shift"
                  rows={summary.byShift.map((bucket) => ({
                    key: bucket.key,
                    label: bucket.name,
                    count: bucket.count,
                  }))}
                />
              </View>
              <View style={styles.cell}>
                <BreakdownBars
                  title="Top areas"
                  rows={summary.topAreas.map((bucket) => ({
                    key: bucket.key,
                    label: bucket.key,
                    count: bucket.count,
                  }))}
                />
              </View>
            </View>
            <SupervisorTable supervisors={summary.supervisors} />
          </Stack>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[4] },
  cell: { flexGrow: 1, flexBasis: 320 },
});
