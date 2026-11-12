import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space } from "@/lib/theme";

export interface CardProps {
  children: ReactNode;
  tone?: "surface" | "subtle" | "inverse" | undefined;
  /** A 6pt left edge in a status colour. The edge is meaning, not decoration. */
  edgeColor?: string | undefined;
  padded?: boolean | undefined;
  onPress?: () => void;
  selected?: boolean | undefined;
  accessibilityLabel?: string | undefined;
  testID?: string | undefined;
}

const TONE = { surface: palette.surface, subtle: palette.grey100, inverse: palette.ink } as const;

/** Flat tonal container: no border, no shadow. Tappable when onPress is given. */
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
    padded ? styles.padded : {},
    edgeColor ? { borderLeftWidth: 6, borderLeftColor: edgeColor } : {},
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
        pressed && { backgroundColor: palette.grey100 },
        ringStyle as ViewStyle,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, overflow: "hidden" },
  padded: { padding: space[4], gap: space[2] },
});
