import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space, touch } from "@/lib/theme";
import { Icon, type IconName } from "../icons";
import { Text } from "../Text";

export type ButtonVariant = "primary" | "secondary" | "tertiary";
export type ButtonSize = "worker" | "desk";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant | undefined;
  /** worker = 56pt (gloves), desk = 44pt. */
  size?: ButtonSize | undefined;
  icon?: IconName | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  fullWidth?: boolean | undefined;
  accessibilityHint?: string | undefined;
  testID?: string | undefined;
}

const BG: Record<ButtonVariant, { rest: string; pressed: string; label: string }> = {
  primary: { rest: palette.ink, pressed: palette.inkPressed, label: palette.onInk },
  secondary: { rest: palette.grey100, pressed: palette.grey300, label: palette.ink },
  tertiary: { rest: "transparent", pressed: palette.grey100, label: palette.ink },
};

/** One primary action per screen. Press darkens the fill; layout never shifts. */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "worker",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { handlers, ringStyle } = useFocusRing();
  const inactive = disabled || loading;
  const colors = BG[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      testID={testID}
      {...handlers}
      style={({ pressed }) => [
        styles.base,
        { minHeight: touch[size] },
        fullWidth && styles.full,
        {
          backgroundColor:
            inactive && variant !== "tertiary"
              ? palette.grey200
              : pressed
                ? colors.pressed
                : colors.rest,
        },
        ringStyle as ViewStyle,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.label} />
        ) : icon ? (
          <Icon
            name={icon}
            size={size === "worker" ? 24 : 20}
            color={inactive ? palette.ink2 : colors.label}
          />
        ) : null}
        <Text
          variant={size === "worker" ? "bodyLg" : "label"}
          style={[
            { color: inactive ? palette.ink2 : colors.label, fontWeight: "700" },
            variant === "tertiary" && styles.underline,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    paddingHorizontal: space[5],
    paddingVertical: space[2],
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  full: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: space[2] },
  underline: { textDecorationLine: "underline" },
});
