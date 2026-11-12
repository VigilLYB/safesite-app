import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import type { Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/ui";
import { useBreakpoint } from "@/lib/responsive";
import { fonts, layout, palette, radii, space, touch } from "@/lib/theme";

type TabsOptions = NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>;
type ResolvedOptions = Exclude<TabsOptions, (...args: never[]) => unknown>;

/**
 * One tab shell for all three roles: a bottom bar on phones, a left sidebar from 768pt up.
 * Navigation sits in the same place for every role.
 */
export function useRoleTabOptions(): ResolvedOptions {
  const { isTablet } = useBreakpoint();
  return {
    headerShown: false,
    // A quick cross-fade between tabs instead of an instant swap.
    animation: "fade",
    tabBarPosition: isTablet ? "left" : "bottom",
    tabBarLabelPosition: isTablet ? "beside-icon" : "below-icon",
    tabBarActiveTintColor: palette.ink,
    tabBarInactiveTintColor: palette.grey500,
    tabBarActiveBackgroundColor: isTablet ? palette.grey200 : "transparent",
    tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
    tabBarItemStyle: {
      borderRadius: radii.control,
      minHeight: touch.worker,
      marginVertical: isTablet ? space[1] : 0,
    },
    tabBarStyle: {
      backgroundColor: isTablet ? palette.grey50 : palette.surface,
      borderTopWidth: 0,
      borderRightWidth: 0,
      ...(isTablet
        ? { width: layout.sidebarWidth, paddingHorizontal: space[2] }
        : { minHeight: 64 }),
    },
  } as ResolvedOptions;
}

export function tabIcon(name: IconName) {
  const TabIcon = ({ color }: { color: ColorValue }) => (
    <Icon name={name} color={typeof color === "string" ? color : palette.ink} />
  );
  return TabIcon;
}
