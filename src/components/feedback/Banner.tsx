import { StyleSheet, View } from "react-native";
import { Button, Icon, Text, type IconName } from "@/components/ui";
import { palette, radii, space } from "@/lib/theme";

export interface BannerProps {
  message: string;
  icon?: IconName | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  /** Inverse banners (demo mode, session ending) stay visible above content. */
  tone?: "subtle" | "inverse" | undefined;
  testID?: string | undefined;
}

/** A persistent, non-blocking message. Never colour alone: an icon and words always carry it. */
export function Banner({
  message,
  icon = "warn",
  actionLabel,
  onAction,
  tone = "subtle",
  testID,
}: BannerProps) {
  const inverse = tone === "inverse";
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[styles.box, { backgroundColor: inverse ? palette.ink : palette.grey100 }]}
    >
      <Icon name={icon} size={18} color={inverse ? palette.onInk : palette.ink} />
      <Text variant="caption" tone={inverse ? "inverse" : "default"} style={styles.flex}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="desk" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    borderRadius: radii.control,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  flex: { flex: 1 },
});
