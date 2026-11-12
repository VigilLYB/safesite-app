import { StyleSheet, View } from "react-native";
import { Button, Icon, Text, type IconName } from "@/components/ui";
import { space } from "@/lib/theme";

export interface EmptyStateProps {
  title: string;
  message?: string | undefined;
  icon?: IconName | undefined;
  actionLabel?: string | undefined;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  icon = "list",
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.box} accessibilityRole="summary">
      <Icon name={icon} size={32} />
      <Text variant="heading">{title}</Text>
      {message ? (
        <Text tone="muted" style={styles.center}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="desk" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: space[2],
    paddingVertical: space[6],
    paddingHorizontal: space[4],
  },
  center: { textAlign: "center" },
});
