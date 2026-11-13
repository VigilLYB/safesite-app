import { StyleSheet, View } from "react-native";
import { palette, radii, space } from "@/lib/theme";
import { KeyValue, type KeyValueProps } from "./KeyValue";

export interface KeyValueGridProps {
  items: KeyValueProps[];
  /** Cells per row (default 2). */
  columns?: number | undefined;
  testID?: string | undefined;
}

/** Label/value pairs in an even grid, rows split by hairlines, so the facts scan in columns. */
export function KeyValueGrid({ items, columns = 2, testID }: KeyValueGridProps) {
  const rows: KeyValueProps[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={styles.grid} testID={testID}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, rowIndex > 0 && styles.divided]}>
          {Array.from({ length: columns }, (_, col) => {
            const item = row[col];
            return (
              <View key={col} style={styles.cell}>
                {item ? <KeyValue {...item} /> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    borderRadius: radii.card,
    backgroundColor: palette.surface,
    paddingHorizontal: space[4],
  },
  row: { flexDirection: "row", gap: space[4], paddingVertical: space[3] },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  cell: { flex: 1, minWidth: 0 },
});
