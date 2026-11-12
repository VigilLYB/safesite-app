import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, touch } from "@/lib/theme";
import { Icon, type IconName } from "../icons";

export interface IconButtonProps {
  icon: IconName;
  /** Required: an icon-only control has no visible name. */
  label: string;
  onPress: () => void;
  size?: number | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

/** Icon control with a 44pt hit area and an accessible name. */
export function IconButton({
  icon,
  label,
  onPress,
  size = 24,
  disabled = false,
  testID,
}: IconButtonProps) {
  const { handlers, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      {...handlers}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? palette.grey300 : palette.grey100,
          opacity: disabled ? 0.5 : 1,
        },
        ringStyle as ViewStyle,
      ]}
    >
      <Icon name={icon} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.desk,
    height: touch.desk,
    borderRadius: radii.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
