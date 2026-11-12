import { StyleSheet, View } from "react-native";
import { Icon, Text } from "@/components/ui";
import { space } from "@/lib/theme";

/** A plain-language warning next to the control it concerns. */
export function FieldNotice({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.row} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="warn" size={18} />
      <Text variant="caption" style={styles.flex}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space[2], alignItems: "flex-start" },
  flex: { flex: 1 },
});
