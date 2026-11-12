import { StyleSheet, View } from "react-native";
import { Icon, Text } from "@/components/ui";
import { palette, radii, space } from "@/lib/theme";

export function InlineNotice({ message }: { message: string }) {
  return (
    <View style={styles.box} accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Icon name="wifi" size={16} />
      <Text variant="caption" style={styles.flex}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    gap: space[2],
    alignItems: "center",
    backgroundColor: palette.grey100,
    borderRadius: radii.control,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  flex: { flex: 1 },
});
