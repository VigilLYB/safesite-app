import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useBreakpoint } from "@/lib/responsive";
import { layout, space } from "@/lib/theme";

export interface MasterDetailProps {
  list: ReactNode;
  /** Rendered beside the list on tablet and desktop. Phones open a separate screen instead. */
  detail: ReactNode;
}

/** Queue on the left, decision on the right (>= 768pt). On phones only the list shows. */
export function MasterDetail({ list, detail }: MasterDetailProps) {
  const { isTablet } = useBreakpoint();
  if (!isTablet) return <View style={styles.flex}>{list}</View>;
  return (
    <View style={styles.split}>
      <View style={styles.list}>{list}</View>
      <View style={styles.flex}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  split: { flex: 1, flexDirection: "row", gap: space[4] },
  list: { width: layout.listPaneWidth },
});
