import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { formatCount } from "@/lib/format";
import { palette, radii, space } from "@/lib/theme";
import { Card, Stack, Text } from "@/components/ui";

export interface BarRow {
  key: string;
  label: string;
  count: number;
  leading?: ReactNode | undefined;
}

/** Horizontal bars with the value printed on every row: readable without colour. */
export function BreakdownBars({ title, rows }: { title: string; rows: readonly BarRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Card>
      <Stack gap={3}>
        <Text variant="label" accessibilityRole="header">
          {title}
        </Text>
        {rows.length === 0 ? (
          <Text tone="muted">No data in this period.</Text>
        ) : (
          rows.map((row) => (
            <View
              key={row.key}
              accessible
              accessibilityLabel={`${row.label}: ${row.count}`}
              style={styles.row}
            >
              <View style={styles.label}>
                {row.leading}
                <Text variant="body" numberOfLines={2} style={styles.flex}>
                  {row.label}
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[styles.fill, { width: `${Math.max(2, (row.count / max) * 100)}%` }]}
                />
              </View>
              <Text variant="mono" style={styles.count}>
                {formatCount(row.count)}
              </Text>
            </View>
          ))
        )}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3] },
  label: { flexDirection: "row", alignItems: "center", gap: space[2], width: 132 },
  flex: { flex: 1 },
  track: {
    flex: 1,
    height: 12,
    backgroundColor: palette.grey200,
    borderRadius: radii.control,
    overflow: "hidden",
  },
  fill: { height: 12, backgroundColor: palette.ink },
  count: { width: 44, textAlign: "right" },
});
