import { StyleSheet, View } from "react-native";
import { Text, SeverityShape } from "@/components/ui";
import { palette, radii, severityTokens, space, type Severity } from "@/lib/theme";
import { severityLabel, severityPips } from "./severity";

const TOTAL_PIPS = 4;

export interface SeverityBadgeProps {
  severity: Severity;
  showPips?: boolean | undefined;
}

/** Shape + label + pips on a tinted pill. Red appears only on Critical. */
export function SeverityBadge({ severity, showPips = true }: SeverityBadgeProps) {
  const tokens = severityTokens[severity];
  const critical = severity === "CRITICAL";
  const filled = severityPips[severity];
  return (
    <View
      accessible
      accessibilityLabel={`${severityLabel[severity]} severity`}
      style={[styles.badge, critical && styles.critical, { backgroundColor: tokens.tint }]}
    >
      <SeverityShape severity={severity} surface="badge" size={critical ? 22 : 18} />
      <Text variant="label" style={styles.label}>
        {severityLabel[severity]}
      </Text>
      {showPips ? (
        <View style={styles.pips} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: TOTAL_PIPS }, (_, index) => (
            <View key={index} style={[styles.pip, { opacity: index < filled ? 1 : 0.28 }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space[2],
    minHeight: 32,
    paddingHorizontal: space[2],
    borderRadius: radii.control,
  },
  critical: { minHeight: 36 },
  label: { fontWeight: "700" },
  pips: { flexDirection: "row", gap: 3, marginLeft: 2 },
  pip: { width: 6, height: 12, borderRadius: 1, backgroundColor: palette.ink },
});
