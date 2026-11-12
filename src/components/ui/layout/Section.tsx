import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/lib/theme";
import { Text } from "../Text";

export interface SectionProps {
  title: string;
  action?: ReactNode | undefined;
  children: ReactNode;
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
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
});
