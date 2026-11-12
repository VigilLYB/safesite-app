import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space, touch } from "@/lib/theme";
import { Text } from "../Text";

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string | undefined;
}

/** Filter toggle. Pressed state is conveyed by fill and by accessibilityState, not colour alone. */
export function Chip({ label, selected, onPress, testID }: ChipProps) {
  const { handlers, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      {...handlers}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? palette.ink : pressed ? palette.grey300 : palette.grey100 },
        ringStyle as ViewStyle,
      ]}
    >
      <Text variant="label" tone={selected ? "inverse" : "default"}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.desk,
    paddingHorizontal: space[4],
    borderRadius: radii.control,
    alignItems: "center",
    justifyContent: "center",
  },
});
