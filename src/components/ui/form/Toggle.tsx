import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useFocusRing } from "@/lib/use-focus-ring";
import { palette, radii, space, touch } from "@/lib/theme";
import { Icon } from "../icons";
import { Text } from "../Text";

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  helper?: string | undefined;
  disabled?: boolean | undefined;
  testID?: string | undefined;
}

/** A labelled checkbox row. State is shown by a tick and announced as `checked`. */
export function Toggle({ label, value, onChange, helper, disabled = false, testID }: ToggleProps) {
  const { handlers, ringStyle } = useFocusRing();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      testID={testID}
      {...handlers}
      style={[styles.row, ringStyle as ViewStyle]}
    >
      <View style={[styles.box, value && styles.boxOn]}>
        {value ? <Icon name="check" size={18} color={palette.onInk} /> : null}
      </View>
      <View style={styles.text}>
        <Text variant="label">{label}</Text>
        {helper ? (
          <Text variant="caption" tone="muted">
            {helper}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space[3], minHeight: touch.desk },
  box: {
    width: 26,
    height: 26,
    borderRadius: radii.control,
    backgroundColor: palette.grey100,
    borderBottomWidth: 3,
    borderBottomColor: palette.fieldBar,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: palette.ink, borderBottomColor: palette.ink },
  text: { flex: 1, gap: 2 },
});
