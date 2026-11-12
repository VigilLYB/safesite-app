import { StyleSheet, View } from "react-native";
import { radii, severityTokens, space, type Severity } from "@/lib/theme";
import { severityLabel, severityPips } from "./severity";

const COLUMNS = 4;

export interface SeverityBadgeProps {
  severity: Severity;
  /** Kept for call-site compatibility; the meter is the whole badge now. */
  showPips?: boolean | undefined;
  size?: "sm" | "md" | undefined;
}

/**
 * Severity as a 4-column "battery" meter on the severity tint: the number of filled columns and
 * the tint say the level together, so it is never colour alone. Screen readers hear the word.
 */
export function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
  const tokens = severityTokens[severity];
  const filled = severityPips[severity];
  const fillColor = tokens.glyph;
  const column = size === "sm" ? styles.columnSm : styles.column;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${severityLabel[severity]} severity`}
      testID={`severity-meter-${severity}`}
      style={[styles.badge, size === "sm" && styles.badgeSm, { backgroundColor: tokens.fill }]}
    >
      {Array.from({ length: COLUMNS }, (_, index) => (
        <View
          key={index}
          testID={index < filled ? "severity-column-on" : "severity-column-off"}
          style={[column, { backgroundColor: fillColor, opacity: index < filled ? 1 : 0.25 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    height: 24,
    paddingHorizontal: space[2],
    borderRadius: radii.control,
  },
  badgeSm: { height: 20, paddingHorizontal: 6, gap: 2 },
  column: { width: 5, height: 12, borderRadius: 1 },
  columnSm: { width: 4, height: 10, borderRadius: 1 },
});
