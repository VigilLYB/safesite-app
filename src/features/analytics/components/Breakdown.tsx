import { Pressable, StyleSheet, View } from "react-native";
import { formatCount } from "@/lib/format";
import { palette, radii, space } from "@/lib/theme";
import { Card, Stack, Text } from "@/components/ui";

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  /** Extra text such as a severity-weighted score. */
  detail?: string | undefined;
  color?: string | undefined;
  onPress?: (() => void) | undefined;
}

/** Counts as text first and a bar second, so nothing depends on colour or on the bar alone. */
export function Breakdown({
  title,
  rows,
  testID,
}: {
  title: string;
  rows: readonly BreakdownRow[];
  testID?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Card testID={testID}>
      <Stack gap={3}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {rows.map((row) => {
          const body = (
            <View style={styles.row} accessible accessibilityLabel={`${row.label}: ${row.count}`}>
              <View style={styles.head}>
                <Text variant="label" style={styles.flex}>
                  {row.label}
                </Text>
                <Text variant="mono">{formatCount(row.count)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${(row.count / max) * 100}%`,
                      backgroundColor: row.color ?? palette.ink,
                    },
                  ]}
                />
              </View>
              {row.detail ? (
                <Text variant="caption" tone="muted">
                  {row.detail}
                </Text>
              ) : null}
            </View>
          );
          return row.onPress ? (
            <Pressable
              key={row.key}
              accessibilityRole="link"
              onPress={row.onPress}
              testID={`bd-${row.key}`}
            >
              {body}
            </Pressable>
          ) : (
            <View key={row.key}>{body}</View>
          );
        })}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[1] },
  head: { flexDirection: "row", gap: space[2], justifyContent: "space-between" },
  flex: { flex: 1 },
  track: {
    height: 8,
    backgroundColor: palette.grey100,
    borderRadius: radii.control,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: radii.control },
});
