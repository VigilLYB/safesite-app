import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space } from "@/lib/theme";

export interface CardProps {
  children: ReactNode;
  tone?: "surface" | "subtle" | "inverse" | undefined;
  /** A thin 3pt left edge in a severity colour. The edge is meaning, not decoration. */
  edgeColor?: string | undefined;
  padded?: boolean | undefined;
  onPress?: () => void;
  selected?: boolean | undefined;
  accessibilityLabel?: string | undefined;
  testID?: string | undefined;
}

const TONE = { surface: palette.surface, subtle: palette.grey50, inverse: palette.ink } as const;

/** Flat container: a tone plus a hairline border, never a shadow. Tappable when onPress is given. */
export function Card({
  children,
  tone = "surface",
  edgeColor,
  padded = true,
  onPress,
  selected = false,
  accessibilityLabel,
  testID,
}: CardProps) {
  const { handlers, ringStyle } = useFocusRing();
  const base: ViewStyle[] = [
    styles.card,
    { backgroundColor: selected ? palette.grey100 : TONE[tone] },
    tone !== "inverse" ? styles.bordered : {},
    selected ? { borderColor: palette.grey400 } : {},
    padded ? styles.padded : {},
    edgeColor ? { borderLeftWidth: 3, borderLeftColor: edgeColor } : {},
  ];

  if (!onPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      {...handlers}
      style={({ pressed }) => [
        ...base,
        pressed && { backgroundColor: palette.grey50 },
        ringStyle as ViewStyle,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, overflow: "hidden" },
  bordered: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: palette.border },
  padded: { padding: space[3], gap: space[2] },
});
