import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { Severity } from "@/lib/api";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space } from "@/lib/theme";
import { Icon, SeverityShape, Text } from "@/components/ui";
import { SEVERITIES, severityHint, severityLabel } from "@/components/domain";

function Option({
  severity,
  selected,
  onPress,
}: {
  severity: Severity;
  selected: boolean;
  onPress: () => void;
}) {
  const { handlers, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${severityLabel[severity]}. ${severityHint[severity]}`}
      onPress={onPress}
      testID={`severity-${severity}`}
      {...handlers}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: selected || pressed ? palette.grey100 : palette.surface },
        selected && styles.selected,
        ringStyle as ViewStyle,
      ]}
    >
      <SeverityShape severity={severity} size={38} />
      <View style={styles.text}>
        <Text variant="bodyLg" style={styles.bold}>
          {severityLabel[severity]}
        </Text>
        <Text variant="caption" tone="muted">
          {severityHint[severity]}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <Icon name="check" size={16} color={palette.onInk} /> : null}
      </View>
    </Pressable>
  );
}

/** Four large targets: shape, label and a plain-language hint. Default Medium, always sent. */
export function SeverityPicker({
  value,
  onChange,
}: {
  value: Severity;
  onChange: (value: Severity) => void;
}) {
  return (
    <View
      style={styles.group}
      accessibilityRole="radiogroup"
      accessibilityLabel="How serious is it?"
    >
      {SEVERITIES.map((severity) => (
        <Option
          key={severity}
          severity={severity}
          selected={value === severity}
          onPress={() => onChange(severity)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    minHeight: 72,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radii.card,
  },
  selected: { borderLeftWidth: 4, borderLeftColor: palette.ink },
  text: { flex: 1, gap: 2 },
  bold: { fontWeight: "700" },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.grey200,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: palette.ink },
});
