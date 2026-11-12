import { StyleSheet, View } from "react-native";
import { userMessage } from "@/lib/api";
import { Icon, Text } from "@/components/ui";
import { space } from "@/lib/theme";

/** Shows the cause and a way forward next to the control that failed. Renders nothing without an error. */
export function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Icon name="warn" size={18} />
      <Text variant="caption" style={styles.flex}>
        {userMessage(error)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space[2], alignItems: "flex-start" },
  flex: { flex: 1 },
});
