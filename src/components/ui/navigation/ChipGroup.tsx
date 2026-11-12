import { StyleSheet, View } from "react-native";
import { space } from "@/lib/theme";
import { Chip } from "./Chip";

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export interface ChipGroupProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Single-select chips that wrap instead of running off screen. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  label,
}: ChipGroupProps<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
});
