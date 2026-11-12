import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { fonts, palette, radii, severityTokens, space, touch } from "@/lib/theme";
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
  /** Marks a destructive action: label/icon read in the CRITICAL colour. Fill is unaffected. */
  destructive?: boolean | undefined;
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
  destructive = false,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { handlers, ringStyle } = useFocusRing();
  const inactive = disabled || loading;
  const colors = BG[variant];
  const labelColor =
    disabled && !loading
      ? palette.grey500
      : destructive
        ? severityTokens.CRITICAL.text
        : colors.label;

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
          <Icon name={icon} size={size === "worker" ? 20 : 18} color={labelColor} />
        ) : null}
        {variant === "tertiary" ? (
          <View style={[styles.tertiaryUnderline, { borderBottomColor: labelColor }]}>
            <Text
              variant={size === "worker" ? "bodyLg" : "label"}
              style={[styles.label, styles.tertiaryLabel, { color: labelColor }]}
            >
              {label}
            </Text>
          </View>
        ) : (
          <Text
            variant={size === "worker" ? "bodyLg" : "label"}
            style={[styles.label, { color: labelColor }]}
          >
            {label}
          </Text>
        )}
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
  // Tertiary has no fill or outline, so bold + a underline (drawn below, not text-decoration,
  // so it can sit a couple of px clear of the descenders) is what marks it as actionable.
  tertiaryLabel: { fontFamily: fonts.bold },
  tertiaryUnderline: { paddingBottom: 3, borderBottomWidth: 1.5 },
});
