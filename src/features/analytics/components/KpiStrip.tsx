import { StyleSheet, View } from "react-native";
import type { AnalyticsSummary } from "@/lib/api";
import { formatCount, formatDuration } from "@/lib/format";
import { palette, radii, severityTokens, space } from "@/lib/theme";
import { Text } from "@/components/ui";

interface KpiProps {
  label: string;
  value: string;
  note?: string;
  critical?: boolean;
}

function Kpi({ label, value, note, critical = false }: KpiProps) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${note ? `. ${note}` : ""}`}
      style={[
        styles.tile,
        critical && {
          borderLeftWidth: 6,
          borderLeftColor: severityTokens.CRITICAL.fill,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="kpi" tone={critical ? "critical" : "default"}>
        {value}
      </Text>
      {note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

/** The five numbers a safety manager checks first. Red appears only on the Critical tile. */
export function KpiStrip({ summary }: { summary: AnalyticsSummary }) {
  const critical = summary.bySeverity.find((bucket) => bucket.key === "CRITICAL")?.count ?? 0;
  return (
    <View style={styles.row}>
      <Kpi label="Critical reports" value={formatCount(critical)} note="In this period" critical />
      <Kpi
        label="Reports"
        value={formatCount(summary.totals.reports)}
        note={`${formatCount(summary.totals.duplicates)} duplicates`}
      />
      <Kpi label="Still open" value={formatCount(summary.totals.open)} />
      <Kpi
        label="Overdue actions"
        value={formatCount(summary.actions.overdue)}
        note={`${formatCount(summary.actions.active)} active`}
      />
      <Kpi label="Avg time to close" value={formatDuration(summary.actions.avgHoursToClose)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space[3] },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    gap: 2,
    padding: space[4],
    borderRadius: radii.card,
    backgroundColor: palette.grey100,
  },
});
