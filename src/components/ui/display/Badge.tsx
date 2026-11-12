import { StyleSheet, View } from "react-native";
import { palette, radii, space } from "@/lib/theme";
import { Icon, type IconName } from "../icons";
import { Text } from "../Text";

export interface BadgeProps {
  label: string;
  tone?: "neutral" | "inverse" | undefined;
  icon?: IconName | undefined;
}

/** Neutral status pill. Severity has its own badge: colour belongs to severity alone. */
export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const inverse = tone === "inverse";
  return (
    <View style={[styles.pill, { backgroundColor: inverse ? palette.grey700 : palette.grey100 }]}>
      {icon ? <Icon name={icon} size={12} color={inverse ? palette.onInk : palette.ink2} /> : null}
      <Text variant="caption" tone={inverse ? "inverse" : "default"}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space[1],
    minHeight: 24,
    paddingHorizontal: space[2],
    borderRadius: radii.control,
  },
});
