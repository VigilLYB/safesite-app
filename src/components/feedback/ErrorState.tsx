import { StyleSheet, View } from "react-native";
import { isApiError, userMessage } from "@/lib/api";
import { Button, Icon, Text } from "@/components/ui";
import { space } from "@/lib/theme";

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Forbidden, not-found, offline and server errors read differently and say what to do. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const kind = isApiError(error) ? error.kind : "unknown";
  const title =
    kind === "forbidden"
      ? "No access"
      : kind === "notFound"
        ? "Not found or not shared with you"
        : kind === "network" || kind === "timeout"
          ? "Can't reach the server"
          : "Something went wrong";
  const reference = isApiError(error) ? error.correlationId : undefined;

  return (
    <View style={styles.box} accessibilityRole="alert">
      <Icon name="warn" size={32} />
      <Text variant="heading">{title}</Text>
      <Text tone="muted" style={styles.center}>
        {userMessage(error)}
      </Text>
      {reference ? (
        <Text variant="mono" tone="muted" selectable>
          Reference: {reference}
        </Text>
      ) : null}
      {onRetry && kind !== "forbidden" ? (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
          size="desk"
          icon="refresh"
        />
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
