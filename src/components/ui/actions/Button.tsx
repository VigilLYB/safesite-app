import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { fonts, palette, radii, space, touch } from "@/lib/theme";
import { Icon, type IconName } from "../icons";
import { Text } from "../Text";
import { LoadingDots } from "./LoadingDots";

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
  secondary: { rest: palette.surface, pressed: palette.grey100, label: palette.ink },
  tertiary: { rest: "transparent", pressed: palette.grey100, label: palette.ink },
};

/** One primary action per screen. Flat: a fill or a hairline outline; press only shifts the tone. */
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
        variant === "secondary" && styles.outlined,
        {
          backgroundColor:
            disabled && !loading && variant !== "tertiary"
              ? palette.grey100
              : pressed
                ? colors.pressed
                : colors.rest,
        },
        ringStyle as ViewStyle,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <LoadingDots color={colors.label} />
        ) : icon ? (
          <Icon
            name={icon}
            size={size === "worker" ? 20 : 18}
            color={disabled ? palette.grey500 : colors.label}
          />
        ) : null}
        <Text
          variant={size === "worker" ? "bodyLg" : "label"}
          style={[styles.label, { color: disabled && !loading ? palette.grey500 : colors.label }]}
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
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  full: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: space[2] },
  outlined: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.grey300 },
  label: { fontFamily: fonts.semibold },
});
