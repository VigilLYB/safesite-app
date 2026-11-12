import { StyleSheet, View } from "react-native";
import type { AnalyticsSummary } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { palette, radii, space } from "@/lib/theme";
import { Card, Stack, Text } from "@/components/ui";

/** Who is closing the loop: assigned, done and overdue actions per supervisor. */
export function SupervisorTable({ supervisors }: { supervisors: AnalyticsSummary["supervisors"] }) {
  return (
    <Card>
      <Stack gap={2}>
        <Text variant="label" accessibilityRole="header">
          Supervisor follow-through
        </Text>
        <View style={styles.row}>
          <Text variant="caption" tone="muted" style={styles.name}>
            Supervisor
          </Text>
          {["Assigned", "Done", "Overdue"].map((heading) => (
            <Text key={heading} variant="caption" tone="muted" style={styles.num}>
              {heading}
            </Text>
          ))}
        </View>
        {supervisors.length === 0 ? (
          <Text tone="muted">No supervisor activity in this period.</Text>
        ) : null}
        {supervisors.map((supervisor, index) => (
          <View
            key={supervisor.id}
            accessible
            accessibilityLabel={`${supervisor.fullName}: ${supervisor.assigned} assigned, ${supervisor.done} done, ${supervisor.overdue} overdue`}
            style={[styles.row, index % 2 === 0 && styles.zebra]}
          >
            <Text style={styles.name}>{supervisor.fullName}</Text>
            <Text variant="mono" style={styles.num}>
              {formatCount(supervisor.assigned)}
            </Text>
            <Text variant="mono" style={styles.num}>
              {formatCount(supervisor.done)}
            </Text>
            <Text variant="mono" style={styles.num}>
              {formatCount(supervisor.overdue)}
            </Text>
          </View>
        ))}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space[2],
    paddingHorizontal: space[2],
    borderRadius: radii.control,
  },
  zebra: { backgroundColor: palette.page },
  name: { flex: 1 },
  num: { width: 72, textAlign: "right" },
});
