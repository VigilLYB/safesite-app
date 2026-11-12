import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space, touch } from "@/lib/theme";
import { Text } from "../Text";

export interface TabOption<T extends string> {
  value: T;
  label: string;
  /** Small count shown next to the label. */
  count?: number | undefined;
}

export interface TabStripProps<T extends string> {
  tabs: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

function TabButton({
  label,
  count,
  selected,
  onPress,
  testID,
}: {
  label: string;
  count: number | undefined;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { handlers, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      {...handlers}
      style={[styles.tab, selected ? styles.selected : null, ringStyle as ViewStyle]}
    >
      <Text variant="label" tone={selected ? "inverse" : "default"}>
        {label}
        {count !== undefined ? ` · ${count}` : ""}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling tab strip. The selected tab is filled and announced, not colour-coded. */
export function TabStrip<T extends string>({ tabs, value, onChange, label }: TabStripProps<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.value}
            label={tab.label}
            count={tab.count}
            selected={tab.value === value}
            onPress={() => onChange(tab.value)}
            testID={`tab-${tab.value}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[2], paddingVertical: space[1] },
  tab: {
    minHeight: touch.desk,
    paddingHorizontal: space[4],
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.grey100,
  },
  selected: { backgroundColor: palette.ink },
});
