import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { palette, space } from "@/lib/theme";
import { Icon, type IconName } from "../icons";
import { Text } from "../Text";

export interface SectionProps {
  title: string;
  icon?: IconName | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
}

export function Section({ title, icon, action, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon ? <Icon name={icon} size={18} color={palette.ink2} /> : null}
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
});
