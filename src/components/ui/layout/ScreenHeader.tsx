import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { space } from "@/lib/theme";
import { IconButton } from "../actions";
import { Text } from "../Text";

export interface ScreenHeaderProps {
  title: string;
  eyebrow?: string | undefined;
  subtitle?: string | undefined;
  onBack?: () => void;
  actions?: ReactNode | undefined;
}

export function ScreenHeader({ title, eyebrow, subtitle, onBack, actions }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? <IconButton icon="back" label="Back" onPress={onBack} /> : null}
      <View style={styles.titles}>
        {eyebrow ? (
          <Text variant="caption" tone="muted">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  titles: { flex: 1, gap: 2 },
  actions: { flexDirection: "row", gap: space[2], alignItems: "center" },
});
