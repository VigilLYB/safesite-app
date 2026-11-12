import { Tabs } from "expo-router";
import type { Role } from "@/lib/api";
import type { IconName } from "@/components/ui";
import { RoleGate } from "@/features/auth";
import { tabIcon, useRoleTabOptions } from "./useRoleTabs";

export interface RoleTab {
  name: string;
  title: string;
  icon: IconName;
}

export interface RoleTabsLayoutProps {
  role: Role;
  tabs: readonly RoleTab[];
  /** Routes that exist inside this role but have no tab (detail pages). */
  hidden?: readonly string[];
}

/** One navigator shape for every role: same placement, same behaviour, different tabs. */
export function RoleTabsLayout({ role, tabs, hidden = ["incident/[id]"] }: RoleTabsLayoutProps) {
  const options = useRoleTabOptions();
  return (
    <RoleGate role={role}>
      <Tabs screenOptions={options}>
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarIcon: tabIcon(tab.icon),
              tabBarAccessibilityLabel: tab.title,
            }}
          />
        ))}
        {hidden.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </RoleGate>
  );
}
