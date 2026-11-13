import { Children, type ReactNode } from "react";
import { View } from "react-native";
import { space } from "@/lib/theme";

type Gap = keyof typeof space;

export interface GridProps {
  children: ReactNode;
  /** Cells per row (default 2). A short last row keeps its cells the same width. */
  columns?: number | undefined;
  gap?: Gap | undefined;
  testID?: string | undefined;
}

/** Equal-width columns: children fill row by row, and each row is as tall as its tallest cell. */
export function Grid({ children, columns = 2, gap = 3, testID }: GridProps) {
  const cells = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  return (
    <View testID={testID} style={{ gap: space[gap] }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: space[gap] }}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={{ flex: 1, minWidth: 0 }}>
              {row[c] ?? null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
