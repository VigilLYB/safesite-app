import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useFocusRing } from "@/lib/use-focus-ring";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { fonts, motion, palette, space, touch } from "@/lib/theme";
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

interface Slot {
  x: number;
  width: number;
}

function TabButton({
  label,
  count,
  selected,
  onPress,
  onLayout,
  testID,
}: {
  label: string;
  count: number | undefined;
  selected: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  testID: string;
}) {
  const { handlers, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLayout={onLayout}
      testID={testID}
      {...handlers}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed, ringStyle as ViewStyle]}
    >
      <Text variant="label" style={selected ? styles.labelOn : styles.labelOff}>
        {label}
        {count !== undefined ? ` · ${count}` : ""}
      </Text>
    </Pressable>
  );
}

/**
 * Horizontally scrolling text tabs over a hairline. A 2pt underline slides to the selected tab;
 * selection is also announced, never shown by the underline alone.
 */
export function TabStrip<T extends string>({ tabs, value, onChange, label }: TabStripProps<T>) {
  const reduced = useReducedMotion();
  const [slots, setSlots] = useState<Record<string, Slot>>({});
  const slot = slots[value];
  const indicator = useAnimatedStyle(() => {
    const timing = { duration: reduced ? 0 : motion.state, easing: Easing.out(Easing.cubic) };
    return {
      opacity: slot ? 1 : 0,
      width: withTiming(slot?.width ?? 0, timing),
      transform: [{ translateX: withTiming(slot?.x ?? 0, timing) }],
    };
  }, [slot, reduced]);

  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.wrap}>
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
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setSlots((prev) =>
                prev[tab.value]?.x === x && prev[tab.value]?.width === width
                  ? prev
                  : { ...prev, [tab.value]: { x, width } },
              );
            }}
            testID={`tab-${tab.value}`}
          />
        ))}
        <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: palette.border },
  row: { gap: space[1] },
  tab: {
    minHeight: touch.desk,
    paddingHorizontal: space[3],
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { backgroundColor: palette.grey50 },
  labelOn: { color: palette.ink, fontFamily: fonts.semibold },
  labelOff: { color: palette.grey600, fontFamily: fonts.medium },
  indicator: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.ink,
  },
});
