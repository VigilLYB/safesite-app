import { useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { fonts, motion, palette, space, touch } from "@/lib/theme";
import { Icon, Text } from "@/components/ui";

const INDICATOR_WIDTH = 28;
const FAB_SIZE = 60;
/** Which section is the primary action: it is drawn as a raised circle in the middle. */
const PRIMARY_ROUTE = "report";
/** The circle is narrow, so its caption is the short word. The full name stays as the accessibility label. */
const PRIMARY_CAPTION = "Report";

/**
 * Phone navigation: icon + label per tab, a short bar that slides to the active tab, and no
 * Android ripple. Tabs hidden from the role (display: none) are skipped but still routable.
 */
export function PhoneTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const reduced = useReducedMotion();
  const [itemWidth, setItemWidth] = useState(0);
  const visible = state.routes.filter((route) => {
    const style = descriptors[route.key]?.options.tabBarItemStyle as
      { display?: string } | undefined;
    return style?.display !== "none";
  });
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visible.findIndex((route) => route.key === activeKey),
  );

  const primaryActive = state.routes[state.index]?.name === PRIMARY_ROUTE;

  const indicator = useAnimatedStyle(() => {
    const x = itemWidth * activeIndex + (itemWidth - INDICATOR_WIDTH) / 2;
    return {
      opacity: itemWidth > 0 && !primaryActive ? 1 : 0,
      transform: [
        {
          translateX: withTiming(x, {
            duration: reduced ? 0 : motion.state,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    };
  }, [itemWidth, activeIndex, reduced, primaryActive]);

  const onLayout = (event: LayoutChangeEvent) =>
    setItemWidth(visible.length > 0 ? event.nativeEvent.layout.width / visible.length : 0);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space[2]) }]}>
      <View style={styles.items} onLayout={onLayout} role="tablist">
        <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} />
        {visible.map((route) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const focused = route.key === activeKey;
          const label = typeof options.title === "string" ? options.title : route.name;
          const color = focused ? palette.ink : palette.grey500;
          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          const primary = route.name === PRIMARY_ROUTE;
          const badge = options.tabBarBadge;
          return (
            <Pressable
              key={route.key}
              role="tab"
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              testID={options.tabBarButtonTestID}
              style={styles.item}
            >
              {primary ? (
                <View style={[styles.fab, focused && styles.fabOn]} testID="report-fab">
                  <Icon name="plus" size={30} color={palette.onInk} />
                </View>
              ) : (
                <View>
                  {options.tabBarIcon?.({ focused, color, size: 22 })}
                  {badge !== undefined && badge !== null ? (
                    <View style={styles.badge} testID="tab-badge">
                      <Text variant="caption" style={styles.badgeText}>
                        {typeof badge === "number" && badge > 9 ? "9+" : String(badge)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
              <Text
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.label,
                  { color },
                  focused && styles.labelOn,
                  primary && styles.fabLabel,
                ]}
              >
                {primary ? PRIMARY_CAPTION : label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    // The raised Report circle pokes above the bar, so it must not clip and must sit on top.
    overflow: "visible",
    zIndex: 10,
    backgroundColor: palette.surface,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: palette.border,
  },
  items: { flexDirection: "row" },
  item: {
    flex: 1,
    minHeight: touch.worker,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingTop: space[1],
  },
  label: { fontFamily: fonts.medium, fontSize: 11 },
  labelOn: { fontFamily: fonts.semibold },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    marginTop: -FAB_SIZE / 2.4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ink,
    // A surface-coloured ring separates the circle from the bar and the page behind it.
    borderWidth: 4,
    borderColor: palette.surface,
    boxShadow: "0 3px 10px rgba(22,24,29,0.28)",
  },
  fabOn: { backgroundColor: palette.inkPressed },
  fabLabel: { marginTop: 2 },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ink,
    borderWidth: 2,
    borderColor: palette.surface,
  },
  badgeText: { color: palette.onInk, fontFamily: fonts.semibold, fontSize: 10, lineHeight: 12 },
  indicator: {
    position: "absolute",
    top: 0,
    left: 0,
    width: INDICATOR_WIDTH,
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.ink,
  },
});
